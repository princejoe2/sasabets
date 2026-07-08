// Meta Cloud API — WhatsApp Business messaging
// Template must be pre-approved in Meta Business Manager.
// Required env vars: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
// Optional: WHATSAPP_TEMPLATE_NAME (default: market_broadcast), WHATSAPP_TEMPLATE_LANGUAGE (default: en)
//
// Template to create in Meta Business Manager:
//   Name: market_broadcast  |  Category: MARKETING  |  Language: English
//   Body: "🎯 New featured prediction on Sabula 256: *{{1}}*\n\nBet now and win on MTN Mobile Money!\n{{2}}"
//
// Admin approval texts use type:text — requires the admin to have messaged the business
// number within 24 h to open the conversation window. One-time setup: text the Sabula 256
// WhatsApp business number from the admin phone.

import { createHmac } from 'crypto'

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN
const TEMPLATE_NAME   = process.env.WHATSAPP_TEMPLATE_NAME    ?? 'market_broadcast'
const TEMPLATE_LANG   = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en'

export interface WaSendResult { phone: string; success: boolean; error?: string }

export async function sendMarketBroadcast(
  phones: string[],
  marketTitle: string,
  marketUrl: string,
): Promise<{ sent: number; failed: number; results: WaSendResult[] }> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WhatsApp env vars not configured (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)')
  }

  const apiUrl  = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`
  const results: WaSendResult[] = []

  for (const phone of phones) {
    const normalised = phone.replace(/^\+/, '')  // Meta expects E.164 without leading +
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   normalised,
          type: 'template',
          template: {
            name:     TEMPLATE_NAME,
            language: { code: TEMPLATE_LANG },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: marketTitle },
                { type: 'text', text: marketUrl   },
              ],
            }],
          },
        }),
      })
      if (res.ok) {
        results.push({ phone: normalised, success: true })
      } else {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        results.push({ phone: normalised, success: false, error: err?.error?.message ?? `HTTP ${res.status}` })
      }
    } catch (e) {
      results.push({ phone: normalised, success: false, error: String(e) })
    }
  }

  return {
    sent:   results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  }
}

// Generic helper — send any message to the admin Telegram chat.
export async function sendAdminTelegram(text: string, inlineKeyboard?: { text: string; url: string }[][]): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  const body: Record<string, unknown> = {
    chat_id:                  chatId,
    text,
    parse_mode:               'Markdown',
    disable_web_page_preview: true,
  }
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard.map(row => row.map(btn => ({ text: btn.text, url: btn.url }))) }
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }).catch(err => console.error('[telegram] send error:', err))
}

// Sends admin a Telegram message via Bot API.
// Setup: message @BotFather on Telegram → /newbot → get token → start the bot →
//   visit https://api.telegram.org/bot{TOKEN}/getUpdates to get your chat_id.
// Required env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Requires ADMIN_REVIEW_SECRET env var for HMAC signing.
export async function sendAdminApprovalRequest(
  _adminPhone: string,
  market: { id: string; title: string; options: Array<{ label: string }>; creatorName?: string },
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  const secret = process.env.ADMIN_REVIEW_SECRET
  if (!secret) return

  const exp       = Math.floor(Date.now() / 1000) + 48 * 3600
  const makeToken = (action: string) =>
    createHmac('sha256', secret).update(`${market.id}:${action}:${exp}`).digest('hex')

  const base       = 'https://sabula256.com/api/admin/market/review'
  const approveUrl = `${base}?id=${market.id}&action=approve&exp=${exp}&sig=${makeToken('approve')}`
  const denyUrl    = `${base}?id=${market.id}&action=deny&exp=${exp}&sig=${makeToken('deny')}`
  const opts       = market.options.map(o => o.label).join(' vs ')

  const text = [
    `🔔 *New Market Pending Approval*`,
    ``,
    `👤 Creator: ${market.creatorName ?? 'Community'}`,
    `📋 Title: ${market.title}`,
    `⚔️ Options: ${opts}`,
    ``,
    `_Tap a button below to approve or deny_`,
  ].join('\n')

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:                  chatId,
      text,
      parse_mode:               'Markdown',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Approve', url: approveUrl }],
          [{ text: '❌ Deny',    url: denyUrl    }],
        ],
      },
    }),
  }).catch(err => console.error('[telegram] admin approval send error:', err))
}
