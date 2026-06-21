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
  const expected = ascii(process.env.RELWORX_WEBHOOK_SECRET ?? '')
  if (!expected) return false  // fail closed
  const provided = req.nextUrl.searchParams.get('secret')
  return provided === expected
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

  if (status === 'success') {
    // Always credit from our own DB record — never trust payload amount
    const credit = Number(txn.amount)
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const newBalance = Number(wallet?.balance ?? 0) + credit
    await Promise.all([
      admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
    ])
  } else if (status === 'failed') {
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  } else {
    // Unknown status — revert back to pending so it can be reprocessed
    await admin.from('transactions').update({ status: 'pending' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
