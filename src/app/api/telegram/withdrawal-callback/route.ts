import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendMoney } from '@/lib/marz'
import { sendPayment } from '@/lib/relworx'

const escMd = (s: string) => s.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')

async function answerCallback(botToken: string, callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  }).catch(() => {})
}

async function editMessage(botToken: string, chatId: number, messageId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'MarkdownV2' }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  // Verify request is genuinely from Telegram.
  // Fail closed: if the secret isn't configured, refuse all requests rather than
  // leaving withdrawal approval open to any caller.
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ ok: false }, { status: 503 })
  const header = req.headers.get('x-telegram-bot-api-secret-token')
  if (header !== webhookSecret) return NextResponse.json({ ok: false }, { status: 401 })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.json({ ok: true })

  let body: { callback_query?: { id: string; data: string; message?: { message_id: number; chat: { id: number } } } }
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const cq = body.callback_query
  if (!cq) return NextResponse.json({ ok: true })

  const callbackId = cq.id
  const data       = cq.data ?? ''
  const msgId      = cq.message?.message_id ?? 0
  const chatId     = cq.message?.chat?.id ?? 0

  const colonIdx = data.indexOf(':')
  if (colonIdx === -1) {
    await answerCallback(botToken, callbackId, 'Invalid action')
    return NextResponse.json({ ok: true })
  }
  const action    = data.slice(0, colonIdx)
  const reference = data.slice(colonIdx + 1)

  if (!['approve', 'reject'].includes(action) || !reference) {
    await answerCallback(botToken, callbackId, 'Invalid action')
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  // ---- Reject: mark failed + refund atomically ---------------------------
  if (action === 'reject') {
    const { data: txn } = await admin
      .from('transactions')
      .update({ status: 'failed' })
      .eq('reference', reference)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .select('user_id, amount, metadata')
      .single()

    if (!txn) {
      await answerCallback(botToken, callbackId, 'Already processed')
      await editMessage(botToken, chatId, msgId, '⚠️ Already processed')
      return NextResponse.json({ ok: true })
    }

    const refundAmt = Math.abs(Number(txn.amount))
    await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: refundAmt })

    const phone = (txn.metadata as { phone?: string })?.phone ?? ''
    await answerCallback(botToken, callbackId, '❌ Rejected')
    await editMessage(botToken, chatId, msgId,
      `❌ *Rejected*\n\nUGX ${refundAmt.toLocaleString()} refunded to user\\.\n📱 ${escMd(phone)}`)
    return NextResponse.json({ ok: true })
  }

  // ---- Approve: atomically claim pending→processing, then call gateway ---
  const { data: txn } = await admin
    .from('transactions')
    .update({ status: 'processing' })
    .eq('reference', reference)
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .select('user_id, amount, metadata')
    .single()

  if (!txn) {
    await answerCallback(botToken, callbackId, 'Already processed')
    await editMessage(botToken, chatId, msgId, '⚠️ Already processed')
    return NextResponse.json({ ok: true })
  }

  const amount = Math.abs(Number(txn.amount))
  const phone  = (txn.metadata as { phone?: string })?.phone ?? ''

  // Trigger disbursement: MarzPay primary → Relworx fallback
  let gatewayMeta: Record<string, string> = {}
  let gatewayOk = false

  try {
    const result = await sendMoney({ phone_number: phone, amount, reference, description: 'Sabula 256 withdrawal' })
    gatewayMeta = { phone, gateway: 'marzpay', marz_uuid: result.data.transaction.uuid, approved_by: 'admin_telegram' }
    gatewayOk = true
  } catch {
    try {
      const result = await sendPayment({ msisdn: phone, amount, reference, description: 'Sabula 256 withdrawal' })
      gatewayMeta = { phone, gateway: 'relworx', internal_reference: result.internal_reference, approved_by: 'admin_telegram' }
      gatewayOk = true
    } catch (err) {
      console.error('[tg-withdrawal-callback] both gateways failed:', err instanceof Error ? err.message : String(err))
    }
  }

  if (!gatewayOk) {
    // Both gateways rejected — refund
    await admin.from('transactions').update({ status: 'failed' }).eq('reference', reference)
    await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: amount })
    await answerCallback(botToken, callbackId, '❌ Gateway failed — refunded')
    await editMessage(botToken, chatId, msgId,
      `❌ *Gateway failed*\n\nUGX ${amount.toLocaleString()} refunded to user\\.\n📱 ${escMd(phone)}`)
    return NextResponse.json({ ok: true })
  }

  // Gateway accepted — update metadata. Status stays 'processing'; the gateway
  // webhook will finalize it to completed/failed.
  await admin.from('transactions').update({ metadata: gatewayMeta }).eq('reference', reference)

  await answerCallback(botToken, callbackId, '✅ Approved — sending money')
  await editMessage(botToken, chatId, msgId,
    `✅ *Approved*\n\nUGX ${amount.toLocaleString()} sent to ${escMd(phone)}\\.\nAwaiting gateway confirmation\\.`)
  return NextResponse.json({ ok: true })
}
