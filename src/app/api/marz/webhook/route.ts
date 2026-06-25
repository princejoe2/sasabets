import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { maybeFireReferralBonus } from '@/lib/referral'

function ascii(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

// Constant-time comparison. Hashing both sides first equalises length so the
// comparison never short-circuits on length and cannot leak the secret via timing.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function validSecret(req: NextRequest): boolean {
  const expected = ascii(process.env.MARZ_WEBHOOK_SECRET ?? '')
  if (!expected) return false  // fail closed — if no secret configured, reject all
  const provided = req.nextUrl.searchParams.get('secret') ?? ''
  return safeEqual(provided, expected)
}

export async function POST(req: NextRequest) {
  if (!validSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  let body: {
    event_type: string
    transaction: { uuid: string; reference: string; status: string }
    disbursement?: { provider_reference?: string }
    collection?: { customer_reference?: string }
  }
  try { body = await req.json() } catch { return NextResponse.json({ received: true }) }

  const { event_type, transaction } = body

  // MarzPay uses different reference fields for collections vs disbursements:
  // - collections: transaction.reference = our customer reference
  // - disbursements: disbursement.provider_reference = our reference; transaction.reference = MarzPay internal UUID
  const ourRef = event_type?.startsWith('disbursement')
    ? (body.disbursement?.provider_reference ?? transaction?.reference)
    : (body.collection?.customer_reference ?? transaction?.reference)

  if (!ourRef) return NextResponse.json({ received: true })

  // Atomic idempotency guard: only process if status is still 'pending'
  // This prevents duplicate webhook deliveries from double-crediting
  const { data: txn, error: claimErr } = await admin
    .from('transactions')
    .update({ status: 'processing' })
    .eq('reference', ourRef)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (claimErr || !txn) return NextResponse.json({ received: true })  // already processed

  if (event_type === 'collection.completed') {
    // Always credit from our own DB record — never trust payload amount.
    // Atomic relative credit (no stale read-then-absolute-write race).
    const credit = Number(txn.amount)
    const { data: newBalance } = await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: credit })
    await admin.from('transactions')
      .update({ status: 'completed', balance_after: newBalance ?? null }).eq('id', txn.id)

    await maybeFireReferralBonus(admin, txn.user_id, txn.id)

  } else if (event_type === 'collection.failed' || event_type === 'collection.cancelled') {
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)

  } else if (event_type === 'disbursement.completed') {
    await admin.from('transactions').update({ status: 'completed' }).eq('id', txn.id)

  } else if (event_type === 'disbursement.failed' || event_type === 'disbursement.cancelled') {
    // Refund wallet atomically. The 'processing' idempotency claim above guarantees
    // this branch runs at most once per transaction, so the user is refunded exactly
    // the originally debited amount and never double-credited. The type guard ensures
    // a misrouted/replayed disbursement event can only ever refund an actual withdrawal.
    if (txn.type === 'withdrawal') {
      const refundAmt = Math.abs(Number(txn.amount))
      await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: refundAmt })
    }
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  } else {
    // Unknown event — revert processing status back to pending
    await admin.from('transactions').update({ status: 'pending' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
