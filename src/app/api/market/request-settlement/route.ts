import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to request settlement' }, { status: 401 })

  const { marketId } = await req.json()
  if (!marketId) return NextResponse.json({ error: 'marketId required' }, { status: 400 })

  // Rate limit: max 2 requests per user per market per day
  const { allowed } = await rateLimit(`settle-req:${user.id}:${marketId}`, 2, 86400)
  if (!allowed) {
    return NextResponse.json({ error: 'You have already requested settlement for this market today.' }, { status: 429 })
  }

  const admin = createAdminClient()

  const { data: market } = await admin
    .from('markets')
    .select('id, title, status')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status === 'settled') return NextResponse.json({ error: 'Market is already settled.' }, { status: 400 })
  if (market.status === 'open') return NextResponse.json({ error: 'Market is still open.' }, { status: 400 })

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const displayName = profile?.username ? `@${profile.username}` : (profile?.full_name ?? 'A user')

  // Log to audit_log
  await admin.from('audit_log').insert({
    actor_id:    user.id,
    action:      'settlement_request',
    target_type: 'market',
    target_id:   marketId,
    details:     { market_title: market.title, requested_by: displayName },
  })

  // Telegram notification to admin
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID
  if (botToken && chatId) {
    // Escape MarkdownV2 special characters to prevent injection
    const escMd = (s: string) => s.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
    const text = [
      `🔔 *Settlement Requested*`,
      ``,
      `📋 Market: ${escMd(market.title)}`,
      `👤 By: ${escMd(displayName)}`,
      `🔗 https://sabula256\\.com/admin/settle\\-queue`,
    ].join('\n')
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2', disable_web_page_preview: true }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
