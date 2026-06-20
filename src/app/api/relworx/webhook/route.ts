import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const body = await req.json()

  const { status, customer_reference, internal_reference, amount } = body

  // Find the transaction by reference
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .or(`reference.eq.${customer_reference},metadata->>internal_reference.eq.${internal_reference}`)
    .eq('status', 'pending')
    .single()

  if (!txn) return NextResponse.json({ received: true })

  if (status === 'success') {
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const newBalance = Number(wallet?.balance ?? 0) + Number(amount ?? txn.amount)
    await Promise.all([
      admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
    ])
  } else if (status === 'failed') {
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
