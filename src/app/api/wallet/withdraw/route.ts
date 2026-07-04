import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMoney } from '@/lib/marz'
import { sendPayment } from '@/lib/relworx'

const MIN_WITHDRAWAL = 5000
const MAX_WITHDRAWAL = 1_000_000
const KYC_THRESHOLD = 5_000_000

// Uganda mobile-money number format (MTN/Airtel/UTL/Africell). Mirrors UG_PHONE_RE
// in lib/marz.ts. We validate BEFORE handing the number to any gateway so a malformed
// or foreign number can never reach the disbursement API.
const UG_PHONE_RE = /^(7\d{8}|39\d{7})$/

// Normalise to E.164 (+2567XXXXXXXX) and validate. Returns null if not a valid UG MoMo number.
function toInternational(phone: string): string | null {
  let digits = String(phone).replace(/[\s\-()]/g, '')
  // Strip leading + / 256 / 0 down to the national significant number.
  digits = digits.replace(/^\+/, '')
  if (digits.startsWith('256')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  if (!/^\d+$/.test(digits)) return null
  if (!UG_PHONE_RE.test(digits)) return null
  return '+256' + digits
}

export async function POST(req: NextRequest) {
  try {
    return await handleWithdraw(req)
  } catch (err) {
    console.error('[withdraw] unhandled:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Withdrawal failed. Please try again.' }, { status: 500 })
  }
}

async function handleWithdraw(req: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  let parsed: unknown
  try { parsed = await req.json() } catch { parsed = null }
  const amount = (parsed as { amount?: unknown } | null)?.amount

  // Amount must be a finite, positive INTEGER number of UGX within bounds.
  // Integer-only blocks float-precision abuse; the range blocks negatives/overflow.
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount < MIN_WITHDRAWAL ||
    amount > MAX_WITHDRAWAL
  ) {
    return NextResponse.json(
      { error: `Withdrawal must be a whole number between UGX ${MIN_WITHDRAWAL.toLocaleString()} and UGX ${MAX_WITHDRAWAL.toLocaleString()}` },
      { status: 400 },
    )
  }

  // Always withdraw to the user's verified profile phone — never a body-supplied number.
  const { data: profile } = await admin.from('profiles')
    .select('phone, kyc_status, suspended, self_excluded_until')
    .eq('id', userId).single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded. Contact support.' }, { status: 403 })
  }
  if (!profile?.phone) {
    return NextResponse.json({ error: 'No verified phone number on file. Update your profile first.' }, { status: 400 })
  }

  // Validate the destination number up front, before any balance mutation.
  const phone_number = toInternational(profile.phone)
  if (!phone_number) {
    return NextResponse.json({ error: 'Your profile phone number is not a valid Ugandan Mobile Money number. Update your profile.' }, { status: 400 })
  }

  // KYC gate for large withdrawals (evaluate before consuming balance).
  if (amount > KYC_THRESHOLD && profile.kyc_status !== 'approved') {
    return NextResponse.json({
      error: 'Withdrawals above UGX 5,000,000 require identity verification. Please complete KYC first.',
      kyc_required: true,
    }, { status: 403 })
  }

  // Rate limit: at most 3 withdrawal requests per hour per user. Counts only
  // non-failed rows so failed/refunded attempts don't permanently consume the budget,
  // but pending/processing/completed all count toward the cap.
  const withdrawWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentWithdrawals } = await admin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'withdrawal')
    .neq('status', 'failed')
    .gte('created_at', withdrawWindow)
  if ((recentWithdrawals ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many withdrawal requests. Please try again in an hour.' }, { status: 429 })
  }

  // ---- Bonus lock check ---------------------------------------------------
  // bonus_balance is the portion of balance that is a non-withdrawable betting credit.
  // Withdrawable = balance - min(bonus_balance, balance).
  const { data: walletRow } = await admin
    .from('wallets')
    .select('balance, bonus_balance')
    .eq('user_id', userId)
    .single()

  const currentBalance  = Number(walletRow?.balance ?? 0)
  const bonusLocked     = Math.min(Number(walletRow?.bonus_balance ?? 0), currentBalance)
  const withdrawable    = currentBalance - bonusLocked

  if (amount > withdrawable) {
    return NextResponse.json(
      { error: `Referral bonuses are not withdrawable. You can withdraw up to UGX ${withdrawable.toLocaleString()}.` },
      { status: 400 },
    )
  }

  const reference = crypto.randomUUID()

  // ---- Atomic debit -------------------------------------------------------
  // Single UPDATE ... RETURNING inside the RPC: reads, checks >= 0, and writes
  // under a row lock. No read-then-write window, so concurrent requests cannot
  // double-spend and a stale absolute value is never written back.
  const { data: balanceAfterDebit, error: debitErr } = await admin
    .rpc('adjust_wallet_balance', { p_user_id: userId, p_delta: -amount })

  if (debitErr) {
    console.error('[withdraw] debit rpc failed:', debitErr.message)
    return NextResponse.json({ error: 'Withdrawal failed. Please try again.' }, { status: 500 })
  }
  // NULL means the debit would have overdrawn (or no wallet) — insufficient funds.
  if (balanceAfterDebit === null || balanceAfterDebit === undefined) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }
  const newBalance = Number(balanceAfterDebit)

  // Helper: atomically refund the just-debited amount, but only once. We guard on
  // the transaction still being 'pending' so a webhook that already finalised the
  // disbursement (completed/failed→refunded) cannot be double-refunded here.
  async function refundOnce() {
    const { data: claimed } = await admin
      .from('transactions')
      .update({ status: 'failed' })
      .eq('reference', reference)
      .eq('status', 'pending')
      .select('id')
    if (claimed && claimed.length > 0) {
      // Only refund if WE won the race to mark it failed.
      await admin.rpc('adjust_wallet_balance', { p_user_id: userId, p_delta: amount })
    }
  }

  // ---- Audit row BEFORE gateway call -------------------------------------
  const { error: insertErr } = await admin.from('transactions').insert({
    user_id: userId,
    type: 'withdrawal',
    amount: -amount,
    balance_after: newBalance,
    status: 'pending',
    reference,
    metadata: { phone: phone_number },
  })
  if (insertErr) {
    // Could not record the ledger row — undo the debit and abort. Never call a
    // gateway without an audit trail.
    console.error('[withdraw] audit insert failed:', insertErr.message)
    await admin.rpc('adjust_wallet_balance', { p_user_id: userId, p_delta: amount })
    return NextResponse.json({ error: 'Withdrawal failed. Please try again.' }, { status: 500 })
  }

  // ---- Disbursement: MarzPay primary → Relworx fallback ------------------
  let gateway: 'relworx' | 'marzpay'
  let gatewayMeta: Record<string, string>

  try {
    const result = await sendMoney({ phone_number, amount, reference, description: 'Sabula 256 withdrawal' })
    gateway = 'marzpay'
    gatewayMeta = { phone: phone_number, marz_uuid: result.data.transaction.uuid }
  } catch (marzErr) {
    try {
      const result = await sendPayment({ msisdn: phone_number, amount, reference, description: 'Sabula 256 withdrawal' })
      gateway = 'relworx'
      gatewayMeta = { phone: phone_number, internal_reference: result.internal_reference }
    } catch (relworxErr) {
      // Both gateways rejected the request outright (no disbursement accepted).
      // Atomic, idempotent refund — safe even if a webhook races us.
      console.error('[withdraw] both gateways failed:',
        marzErr instanceof Error ? marzErr.message : String(marzErr), '|',
        relworxErr instanceof Error ? relworxErr.message : String(relworxErr))
      await refundOnce()
      return NextResponse.json({ error: 'Disbursement failed. Your balance has been restored.' }, { status: 502 })
    }
  }

  // Disbursement accepted by a gateway. The transaction stays 'pending' until the
  // gateway webhook confirms completion or failure (which refunds via the same
  // atomic guard). Record gateway metadata without clobbering the existing fields.
  await admin.from('transactions').update({
    metadata: { phone: phone_number, gateway, ...gatewayMeta },
  }).eq('reference', reference)

  return NextResponse.json({ success: true, newBalance, reference })
}
