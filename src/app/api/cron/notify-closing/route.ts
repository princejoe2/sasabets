import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, btn } from '@/lib/email'

const SITE = 'https://sabula256.com'

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = req.headers.get('authorization')
  const url  = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${cronSecret}` && url !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Purge rate limit log entries older than 24 hours
  await admin.from('rate_limit_log')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Markets closing within next 24 hours that haven't been notified yet
  const now       = new Date()
  const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: markets } = await admin
    .from('markets')
    .select('id, title, closes_at')
    .eq('status', 'open')
    .is('closing_notified_at', null)
    .gte('closes_at', now.toISOString())
    .lte('closes_at', in24h.toISOString())

  if (!markets?.length) return NextResponse.json({ notified: 0 })

  // Fetch all auth users once to build email map
  let emailMap: Record<string, string> = {}
  try {
    // listUsers paginates at 1000 per page — enough for most apps
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))
  } catch (err) {
    console.error('[notify-closing] Failed to fetch users:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  let totalEmails = 0

  for (const market of markets) {
    // Get distinct bettors on this market
    const { data: bets } = await admin
      .from('bets')
      .select('user_id')
      .eq('market_id', market.id)
      .eq('status', 'active')

    const seen = new Set<string>()
    const userIds = (bets ?? []).map(b => b.user_id).filter(id => { if (seen.has(id)) return false; seen.add(id); return true })
    if (!userIds.length) {
      // No bettors — still mark notified so we don't recheck
      await admin.from('markets').update({ closing_notified_at: now.toISOString() }).eq('id', market.id)
      continue
    }

    const closesAt = new Date(market.closes_at!)
    const hoursLeft = Math.round((closesAt.getTime() - now.getTime()) / 3_600_000)
    const timeStr = hoursLeft >= 2
      ? `${hoursLeft} hours`
      : hoursLeft === 1
        ? '1 hour'
        : 'less than an hour'

    const closesFormatted = closesAt.toLocaleString('en-UG', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala',
    })

    const marketUrl = `${SITE}/markets/${market.id}`

    for (const userId of userIds) {
      const email = emailMap[userId]
      if (!email) continue

      await sendEmail(
        email,
        `⏰ Market closing in ${timeStr}: ${market.title}`,
        `
        <div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px;text-align:center">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c4b5fd">Sabula 256</p>
            <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Market Closing Soon</h1>
            <p style="margin:12px 0 0;font-size:42px">⏰</p>
          </div>

          <!-- Urgency banner -->
          <div style="background:#7c2d12;border-top:1px solid #c2410c;border-bottom:1px solid #c2410c;padding:14px 24px;text-align:center">
            <p style="margin:0;font-size:15px;font-weight:800;color:#fed7aa;letter-spacing:1px">
              ⚠️ CLOSING IN ${timeStr.toUpperCase()} — PLACE YOUR BET NOW
            </p>
          </div>

          <div style="padding:32px 28px">
            <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px">Market</p>
            <h2 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.3">${esc(market.title)}</h2>

            <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:16px 20px;margin:0 0 24px">
              <p style="margin:0;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px">Closes at</p>
              <p style="margin:6px 0 0;font-size:17px;font-weight:800;color:#fbbf24">${closesFormatted} (EAT)</p>
            </div>

            <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
              You have an active bet on this market. Once it closes, no more predictions will be accepted.
              If you want to change or review your position, now is the time.
            </p>

            ${btn(marketUrl, '🔮 View Market & Bet', '#7c3aed')}

            <p style="margin:24px 0 0;font-size:12px;color:#334155;text-align:center">
              You're receiving this because you have an active bet on this market.<br>
              <a href="${SITE}" style="color:#6d28d9">sabula256.com</a>
            </p>
          </div>
        </div>
        `
      )
      totalEmails++
    }

    // Mark market as notified
    await admin.from('markets')
      .update({ closing_notified_at: now.toISOString() })
      .eq('id', market.id)
  }

  return NextResponse.json({ notified: totalEmails, markets: markets.length })
}
