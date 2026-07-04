import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPesapalToken, getTransactionStatus } from '@/lib/pesapal'
import { createHash, timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderTrackingId = searchParams.get('orderTrackingId')
  const orderNotificationType = searchParams.get('orderNotificationType')
  const secret = searchParams.get('secret') ?? ''

  const expected = process.env.PESAPAL_WEBHOOK_SECRET ?? ''
  if (!expected || !safeEqual(secret, expected)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!orderTrackingId || orderNotificationType !== 'IPNCHANGE') {
    return NextResponse.json({ error: 'Invalid IPN' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const token = await getPesapalToken()
    const status = await getTransactionStatus(token, orderTrackingId)

    // Atomic idempotency: flip pending→processing in one statement.
    // If 0 rows updated, this IPN was already processed — return early.
    const { data: txn } = await admin
      .from('transactions')
      .update({ status: 'processing' })
      .eq('pesapal_tracking_id', orderTrackingId)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (!txn) return NextResponse.json({ orderNotificationType, orderTrackingId })

    if (status.payment_status_description === 'Completed') {
      // Credit atomically via RPC — eliminates read-modify-write race on concurrent IPNs
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: txn.user_id,
        p_delta: Number(txn.amount),
      })
      await admin
        .from('transactions')
        .update({ status: 'completed', balance_after: newBalance ?? null })
        .eq('id', txn.id)
    } else if (['Failed', 'Reversed', 'Invalid'].includes(status.payment_status_description)) {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
    } else {
      // Unknown status — revert so it can be reprocessed
      await admin.from('transactions').update({ status: 'pending' }).eq('id', txn.id)
    }
  } catch (err) {
    console.error('IPN error:', err)
  }

  // Pesapal expects 200 with this body
  return NextResponse.json({ orderNotificationType, orderTrackingId })
}
