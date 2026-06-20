import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPayment } from '@/lib/relworx'

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

  if (!amount || amount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}` }, { status: 400 })
  }
  if (!phone) {
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
  const msisdn = toInternational(phone)
  const reference = `WD-${user.id.slice(0, 8)}-${Date.now()}`

  // Deduct balance first
  const { error: walletErr } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (walletErr) return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 })

  // Initiate Relworx disbursement
  let internalReference: string | null = null
  try {
    const result = await sendPayment({ msisdn, amount, reference, description: 'Sabula 256 withdrawal' })
    internalReference = result.internal_reference
  } catch (err) {
    // Rollback wallet on Relworx failure
    await admin.from('wallets').update({ balance: wallet.balance }).eq('user_id', user.id)
    const message = err instanceof Error ? err.message : 'Disbursement failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Record transaction
  const { error: txnErr } = await admin.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount: -amount,
    balance_after: newBalance,
    status: 'pending',
    reference,
    metadata: { phone: msisdn, internal_reference: internalReference },
  })

  if (txnErr) {
    // Disbursement is already in-flight — log but don't fail the user
    console.error('Transaction record failed after Relworx send:', txnErr.message)
  }

  return NextResponse.json({ success: true, newBalance, reference })
}
