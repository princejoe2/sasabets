import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function validSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.RELWORX_WEBHOOK_SECRET
  return !!expected && secret === expected
}

function validAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

export async function POST(req: NextRequest) {
  if (!validSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const body = await req.json()
  const { status, customer_reference, internal_reference, amount } = body

  if (!status || (!customer_reference && !internal_reference)) {
    return NextResponse.json({ received: true })
  }

  // Parameterised lookup — no string interpolation into filter
  let txn = null
  if (customer_reference) {
    const { data } = await admin
      .from('transactions')
      .select('*')
      .eq('reference', String(customer_reference))
      .eq('status', 'pending')
      .maybeSingle()
    txn = data
  }
  if (!txn && internal_reference) {
    const { data } = await admin
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .filter('metadata->>internal_reference', 'eq', String(internal_reference))
      .maybeSingle()
    txn = data
  }

  if (!txn) return NextResponse.json({ received: true })

  if (status === 'success') {
    const creditAmount = validAmount(amount) ? amount : Number(txn.amount)
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const newBalance = Number(wallet?.balance ?? 0) + creditAmount
    await Promise.all([
      admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
    ])
  } else if (status === 'failed') {
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
