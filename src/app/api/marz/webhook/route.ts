import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'

function validSecret(req: NextRequest): boolean {
  const secret   = req.nextUrl.searchParams.get('secret')
  const expected = (process.env.MARZ_WEBHOOK_SECRET ?? '').replace(/^﻿/, '').trim()
  return !!expected && secret === expected
}

interface MarzWebhookPayload {
  event_type: string
  transaction: {
    uuid: string
    reference: string
    status: string
    amount: { raw: number; currency: string }
  }
}

export async function POST(req: NextRequest) {
  if (!validSecret(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  let body: MarzWebhookPayload
  try { body = await req.json() } catch { return NextResponse.json({ received: true }) }

  const { event_type, transaction } = body
  if (!transaction?.reference) return NextResponse.json({ received: true })

  const { data: txn } = await admin.from('transactions')
    .select('*').eq('reference', transaction.reference).eq('status', 'pending').maybeSingle()

  if (!txn) return NextResponse.json({ received: true })

  const isCollectionSuccess = event_type === 'collection.completed' || event_type === 'collection.successful'
  const isGenericSuccess    = event_type === 'success' && txn.type === 'deposit'
  const isDisbursementOk    = event_type === 'success' && txn.type === 'withdrawal'

  if (isCollectionSuccess || isGenericSuccess) {
    const creditAmount = transaction.amount?.raw ?? Number(txn.amount)
    const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
    const newBalance = Number(wallet?.balance ?? 0) + creditAmount
    await Promise.all([
      admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id),
      admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
    ])
  } else if (isDisbursementOk) {
    await admin.from('transactions').update({ status: 'completed' }).eq('id', txn.id)
    try {
      const { data: profile } = await admin.from('profiles').select('phone').eq('id', txn.user_id).single()
      if (profile?.phone) {
        await sendSms('+' + profile.phone,
          `Sabula 256: Your withdrawal of UGX ${Math.abs(Number(txn.amount)).toLocaleString()} has been sent to your Mobile Money account.`
        )
      }
    } catch { /* non-critical */ }
  } else if (
    event_type === 'collection.failed' || event_type === 'collection.cancelled' ||
    event_type === 'failure'
  ) {
    if (txn.type === 'withdrawal') {
      // Rollback wallet on failed disbursement
      const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', txn.user_id).single()
      const refundedBalance = Number(wallet?.balance ?? 0) + Math.abs(Number(txn.amount))
      await admin.from('wallets').update({ balance: refundedBalance, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id)
    }
    await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
  }

  return NextResponse.json({ received: true })
}
