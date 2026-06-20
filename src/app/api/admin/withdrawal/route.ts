import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { transactionId, action } = await req.json()
  if (!transactionId || !['complete', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .single()

  if (!txn) return NextResponse.json({ error: 'Withdrawal not found or already processed' }, { status: 404 })

  if (action === 'complete') {
    await admin.from('transactions').update({ status: 'completed' }).eq('id', transactionId)
    return NextResponse.json({ success: true })
  }

  // Reject: refund the amount back to wallet
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
  const refundedBalance = parseFloat(wallet?.balance ?? 0) + Math.abs(parseFloat(txn.amount))

  await Promise.all([
    admin.from('wallets').update({ balance: refundedBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
    admin.from('transactions').update({ status: 'failed' }).eq('id', transactionId),
  ])

  return NextResponse.json({ success: true })
}
