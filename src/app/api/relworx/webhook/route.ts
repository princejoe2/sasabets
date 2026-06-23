import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

function ascii(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

// Constant-time string comparison. Hashing both sides first guarantees equal-length
// inputs (so length itself doesn't leak) before the timing-safe compare.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function validSecret(req: NextRequest): boolean {
  const expected = ascii(process.env.RELWORX_WEBHOOK_SECRET ?? '')
  if (!expected) return false  // fail closed
  const provided = req.nextUrl.searchParams.get('secret') ?? ''
  return safeEqual(provided, expected)
}

export async function POST(req: NextRequest) {
  if (!validSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  let body: { status?: string; customer_reference?: string; internal_reference?: string }
  try { body = await req.json() } catch { return NextResponse.json({ received: true }) }

  const { status, customer_reference, internal_reference } = body

  if (!status || (!customer_reference && !internal_reference)) {
    return NextResponse.json({ received: true })
  }

  // Atomic idempotency: flip pending→processing in one statement.
  // If 0 rows updated, the webhook was already processed — return early.
  let txn: Record<string, unknown> | null = null

  if (customer_reference) {
    const { data } = await admin
      .from('transactions')
      .update({ status: 'processing' })
      .eq('reference', String(customer_reference))
      .eq('status', 'pending')
      .select('*')
      .single()
    txn = data
  }

  if (!txn && internal_reference) {
    const { data } = await admin
      .from('transactions')
      .update({ status: 'processing' })
      .filter('metadata->>internal_reference', 'eq', String(internal_reference))
      .eq('status', 'pending')
      .select('*')
      .single()
    txn = data
  }

  if (!txn) return NextResponse.json({ received: true })  // already processed

  // txn.amount is signed: deposits are positive, withdrawals negative. The handling
  // is direction-aware so a successful WITHDRAWAL is never re-applied to the balance
  // (the balance was already debited at request time) and a FAILED withdrawal is
  // refunded with the absolute amount.
  const isWithdrawal = txn.type === 'withdrawal' || Number(txn.amount) < 0

  if (status === 'success') {
    if (isWithdrawal) {
      // Disbursement confirmed. Balance was already debited up front — just finalise.
      await admin.from('transactions').update({ status: 'completed' }).eq('id', txn.id)
    } else {
      // Deposit confirmed — credit atomically from our own DB record (never the payload).
      const credit = Number(txn.amount)
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: credit })
      await admin.from('transactions')
        .update({ status: 'completed', balance_after: newBalance ?? null }).eq('id', txn.id)
    }
  } else if (status === 'failed') {
    if (isWithdrawal) {
      // Disbursement failed — refund the originally debited amount atomically.
      // The pending→processing claim above guarantees this runs at most once.
      const refundAmt = Math.abs(Number(txn.amount))
      await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: refundAmt })
    }
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  } else {
    // Unknown status — revert back to pending so it can be reprocessed
    await admin.from('transactions').update({ status: 'pending' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
