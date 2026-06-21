import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function ascii(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

function validSecret(req: NextRequest): boolean {
  const expected = ascii(process.env.MARZ_WEBHOOK_SECRET ?? '')
  if (!expected) return false  // fail closed — if no secret configured, reject all
  const provided = req.nextUrl.searchParams.get('secret')
  return provided === expected
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
    // Always credit from our own DB record — never trust payload amount
    const credit = Number(txn.amount)
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const newBalance = Number(wallet?.balance ?? 0) + credit
    await Promise.all([
      admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
    ])

  } else if (event_type === 'collection.failed' || event_type === 'collection.cancelled') {
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)

  } else if (event_type === 'disbursement.completed') {
    await admin.from('transactions').update({ status: 'completed' }).eq('id', txn.id)

  } else if (event_type === 'disbursement.failed' || event_type === 'disbursement.cancelled') {
    // Refund wallet
    const refundAmt = Math.abs(Number(txn.amount))
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const refunded = Number(wallet?.balance ?? 0) + refundAmt
    await Promise.all([
      admin.from('wallets').update({ balance: refunded, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id),
    ])
  } else {
    // Unknown event — revert processing status back to pending
    await admin.from('transactions').update({ status: 'pending' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
