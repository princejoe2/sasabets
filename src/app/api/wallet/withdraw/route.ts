import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMoney } from '@/lib/marz'

const MIN_WITHDRAWAL = 5000

function toInternational(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, phone } = await req.json()

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_WITHDRAWAL || amount > 100_000_000) {
    return NextResponse.json({ error: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}` }, { status: 400 })
  }
  if (!phone || typeof phone !== 'string' || phone.length > 20) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  // KYC gate for large withdrawals
  if (amount > 5_000_000) {
    const { data: profile } = await admin.from('profiles').select('kyc_status').eq('id', user.id).single()
    if (profile?.kyc_status !== 'approved') {
      return NextResponse.json({
        error: 'Withdrawals above UGX 5,000,000 require identity verification. Please complete KYC first.',
        kyc_required: true,
      }, { status: 403 })
    }
  }

  const { data: wallet } = await admin
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet || Number(wallet.balance) < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const newBalance = Number(wallet.balance) - amount
  const phone_number = toInternational(phone)
  const reference    = crypto.randomUUID()

  // Deduct balance first
  const { error: walletErr } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (walletErr) return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 })

  // Initiate Marz disbursement
  let marzUuid: string | null = null
  try {
    const result = await sendMoney({ phone_number, amount, reference, description: 'Sabula 256 withdrawal' })
    marzUuid = result.data.transaction.uuid
  } catch (err) {
    // Rollback wallet on Marz failure
    await admin.from('wallets').update({ balance: wallet.balance }).eq('user_id', user.id)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Disbursement failed' }, { status: 502 })
  }

  // Record transaction
  const { error: txnErr } = await admin.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount: -amount,
    balance_after: newBalance,
    status: 'pending',
    reference,
    metadata: { phone: phone_number, marz_uuid: marzUuid },
  })

  if (txnErr) {
    // Disbursement is already in-flight — log but don't fail the user
    console.error('Transaction record failed after Relworx send:', txnErr.message)
  }

  return NextResponse.json({ success: true, newBalance, reference })
}
