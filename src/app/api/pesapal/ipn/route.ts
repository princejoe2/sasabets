import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPesapalToken, getTransactionStatus } from '@/lib/pesapal'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderTrackingId = searchParams.get('orderTrackingId')
  const orderNotificationType = searchParams.get('orderNotificationType')

  if (!orderTrackingId || orderNotificationType !== 'IPNCHANGE') {
    return NextResponse.json({ error: 'Invalid IPN' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const token = await getPesapalToken()
    const status = await getTransactionStatus(token, orderTrackingId)

    // Find pending transaction by tracking ID
    const { data: txn } = await admin
      .from('transactions')
      .select('*')
      .eq('pesapal_tracking_id', orderTrackingId)
      .eq('status', 'pending')
      .single()

    if (!txn) return NextResponse.json({ orderNotificationType, orderTrackingId })

    if (status.payment_status_description === 'Completed') {
      // Credit wallet
      const { data: wallet } = await admin
        .from('wallets')
        .select('balance')
        .eq('user_id', txn.user_id)
        .single()

      const newBalance = parseFloat(wallet?.balance ?? 0) + parseFloat(txn.amount)

      await admin
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', txn.user_id)

      await admin
        .from('transactions')
        .update({ status: 'completed', balance_after: newBalance })
        .eq('id', txn.id)
    } else if (['Failed', 'Reversed', 'Invalid'].includes(status.payment_status_description)) {
      await admin
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', txn.id)
    }
  } catch (err) {
    console.error('IPN error:', err)
  }

  // Pesapal expects 200 with this body
  return NextResponse.json({ orderNotificationType, orderTrackingId })
}
