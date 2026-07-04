import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getPesapalToken, getTransactionStatus } from '@/lib/pesapal'

export async function POST() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find the most recent pending deposit for this user
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!txn?.pesapal_tracking_id) {
    return NextResponse.json({ credited: false, reason: 'no_pending' })
  }

  try {
    const token = await getPesapalToken()
    const status = await getTransactionStatus(token, txn.pesapal_tracking_id)

    if (status.payment_status_description === 'Completed') {
      // Atomic idempotency flip — only one winner (poll vs webhook) credits the wallet
      const { data: claimed } = await admin
        .from('transactions')
        .update({ status: 'processing' })
        .eq('id', txn.id)
        .eq('status', 'pending')
        .select('amount')
        .single()
      if (!claimed) {
        const { data: fresh } = await admin.from('transactions').select('status, balance_after').eq('id', txn.id).single()
        if (fresh?.status === 'completed') return NextResponse.json({ credited: true, amount: txn.amount, newBalance: fresh.balance_after })
        return NextResponse.json({ credited: false, reason: 'pending' })
      }
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: user.id,
        p_delta:   Number(claimed.amount),
      })
      await admin.from('transactions').update({ status: 'completed', balance_after: newBalance ?? null }).eq('id', txn.id)
      return NextResponse.json({ credited: true, amount: txn.amount, newBalance })
    }

    if (['Failed', 'Reversed', 'Invalid'].includes(status.payment_status_description)) {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
      return NextResponse.json({ credited: false, reason: 'payment_failed', pesapalStatus: status.payment_status_description })
    }

    return NextResponse.json({ credited: false, reason: 'pending', pesapalStatus: status.payment_status_description })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify failed'
    return NextResponse.json({ credited: false, reason: 'error', message }, { status: 500 })
  }
}
