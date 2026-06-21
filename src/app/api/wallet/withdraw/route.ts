import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMoney } from '@/lib/marz'
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

  const { amount } = await req.json()

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_WITHDRAWAL || amount > 10_000_000) {
    return NextResponse.json({ error: `Withdrawal must be between UGX ${MIN_WITHDRAWAL.toLocaleString()} and UGX 10,000,000` }, { status: 400 })
  }

  // Always withdraw to the user's verified profile phone — never a body-supplied number
  const { data: profile } = await admin.from('profiles')
    .select('phone, kyc_status, suspended, self_excluded_until')
    .eq('id', user.id).single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded. Contact support.' }, { status: 403 })
  }
  if (!profile?.phone) {
    return NextResponse.json({ error: 'No verified phone number on file. Update your profile first.' }, { status: 400 })
  }

  // Rate limit: 3 withdrawal requests per hour per user
  const withdrawWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentWithdrawals } = await admin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'withdrawal')
    .gte('created_at', withdrawWindow)
  if ((recentWithdrawals ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many withdrawal requests. Please try again in an hour.' }, { status: 429 })
  }

  // KYC gate for large withdrawals
  if (amount > 5_000_000) {
    if (profile.kyc_status !== 'approved') {
      return NextResponse.json({
        error: 'Withdrawals above UGX 5,000,000 require identity verification. Please complete KYC first.',
        kyc_required: true,
      }, { status: 403 })
    }
  }

  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()

  if (!wallet || Number(wallet.balance) < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const newBalance = Number(wallet.balance) - amount
  const phone_number = toInternational(profile.phone)
  const reference    = crypto.randomUUID()

  // Atomic deduction: WHERE balance >= amount prevents overdraft under concurrency
  const { data: updated } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .gte('balance', amount)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Insert transaction record BEFORE gateway call — audit trail even if server crashes mid-flight
  await admin.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount: -amount,
    balance_after: newBalance,
    status: 'pending',
    reference,
    metadata: { phone: phone_number },
  })

  // MarzPay primary → Relworx fallback
  let gateway: 'relworx' | 'marzpay'
  let gatewayMeta: Record<string, string>

  try {
    const result = await sendMoney({ phone_number, amount, reference, description: 'Sabula 256 withdrawal' })
    gateway = 'marzpay'
    gatewayMeta = { phone: phone_number, marz_uuid: result.data.transaction.uuid }
  } catch {
    try {
      const result = await sendPayment({ msisdn: phone_number, amount, reference, description: 'Sabula 256 withdrawal' })
      gateway = 'relworx'
      gatewayMeta = { phone: phone_number, internal_reference: result.internal_reference }
    } catch {
      // Both gateways failed — rollback wallet and mark transaction failed
      await Promise.all([
        admin.from('wallets').update({ balance: wallet.balance, updated_at: new Date().toISOString() }).eq('user_id', user.id),
        admin.from('transactions').update({ status: 'failed' }).eq('reference', reference),
      ])
      return NextResponse.json({ error: 'Disbursement failed. Your balance has been restored.' }, { status: 502 })
    }
  }

  // Update transaction with gateway metadata
  await admin.from('transactions').update({
    metadata: { gateway, ...gatewayMeta },
  }).eq('reference', reference)

  return NextResponse.json({ success: true, newBalance, reference })
}
