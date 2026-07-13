import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
    .select('phone, kyc_status, suspended, self_excluded_until, full_name, username')
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
  // NOTE: effectively dead code since MAX_WITHDRAWAL < KYC_THRESHOLD — kept as a
  // belt-and-braces guard; the real gate is the cumulative 30-day check below.
  if (amount > KYC_THRESHOLD && profile.kyc_status !== 'approved') {
    return NextResponse.json({
      error: 'Withdrawals above UGX 5,000,000 require identity verification. Please complete KYC first.',
      kyc_required: true,
    }, { status: 403 })
  }

  // Cumulative KYC gate: per-transaction caps alone let users move unlimited funds in
  // MAX_WITHDRAWAL slices. Sum completed withdrawals over a rolling 30-day window and
  // require KYC once (volume + this request) crosses the threshold.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: volumeData } = await admin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'withdrawal')
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo)

  const thirtyDayVolume = (volumeData ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const CUMULATIVE_KYC_THRESHOLD = 5_000_000

  if (thirtyDayVolume + amount > CUMULATIVE_KYC_THRESHOLD && profile.kyc_status !== 'approved') {
    return NextResponse.json({
      error: 'KYC verification required. Your 30-day withdrawal volume has exceeded UGX 5,000,000. Please complete identity verification.',
      code: 'kyc_required',
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

  // ---- Audit row — no gateway call yet (manual approval required) --------
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
    console.error('[withdraw] audit insert failed:', insertErr.message)
    await admin.rpc('adjust_wallet_balance', { p_user_id: userId, p_delta: amount })
    return NextResponse.json({ error: 'Withdrawal failed. Please try again.' }, { status: 500 })
  }

  // ---- Notify admin via Telegram (approve / reject buttons) --------------
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID
  if (botToken && chatId) {
    const displayName = profile?.username ? `@${profile.username}` : (profile?.full_name ?? 'Unknown')
    const escMd = (s: string) => s.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
    const text = [
      `💸 *Withdrawal Request*`,
      ``,
      `👤 ${escMd(displayName)}`,
      `📱 ${escMd(phone_number)}`,
      `💰 UGX ${amount.toLocaleString()}`,
      `🆔 \`${reference}\``,
    ].join('\n')
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: `approve:${reference}` },
            { text: '❌ Reject',  callback_data: `reject:${reference}`  },
          ]],
        },
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, newBalance, reference, pending_approval: true })
}
