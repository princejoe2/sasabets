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
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Markets with a closing date that has passed by 30+ days and are still open
  const { data: markets } = await admin
    .from('markets')
    .select('id, title, created_by')
    .eq('status', 'open')
    .not('created_by', 'is', null)
    .lt('closes_at', cutoff)

  if (!markets?.length) return NextResponse.json({ refunded: 0, markets: 0 })

  // Fetch admin IDs to exclude admin-created markets
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
  const adminIds = new Set((adminProfiles ?? []).map(p => p.id))

  let emailMap: Record<string, string> = {}
  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))
  } catch { /* ignore — emails are best-effort */ }

  let totalRefunded = 0
  let marketsProcessed = 0

  for (const market of markets) {
    if (adminIds.has(market.created_by!)) continue

    // Claim atomically — skip if status changed between query and now
    const { data: claimed } = await admin
      .from('markets')
      .update({ status: 'cancelled' })
      .eq('id', market.id)
      .eq('status', 'open')
      .select('id')
      .single()

    if (!claimed) continue

    // Fetch all active bets and refund each
    const { data: bets } = await admin
      .from('bets')
      .select('id, user_id, amount')
      .eq('market_id', market.id)
      .eq('status', 'active')

    if (!bets?.length) {
      marketsProcessed++
      continue
    }

    const notified = new Set<string>()

    for (const bet of bets) {
      const refund = Number(bet.amount)

      // Mark bet cancelled atomically
      const { data: claimedBet } = await admin
        .from('bets')
        .update({ status: 'cancelled' })
        .eq('id', bet.id)
        .eq('status', 'active')
        .select('id')

      if (!claimedBet || claimedBet.length === 0) continue

      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: bet.user_id,
        p_delta: refund,
      })

      await admin.from('transactions').insert({
        user_id: bet.user_id,
        type: 'refund',
        amount: refund,
        balance_after: newBalance ?? undefined,
        status: 'completed',
        metadata: { marketId: market.id, market_title: market.title, reason: 'abandoned_30d' },
      })

      totalRefunded++

      // Email notification (one per user per market)
      if (!notified.has(bet.user_id)) {
        notified.add(bet.user_id)
        const email = emailMap[bet.user_id]
        if (email) {
          sendEmail(
            email,
            `Refund: your bet on "${market.title}" has been returned`,
            `
            <div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
              <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;text-align:center">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c4b5fd">Sabula 256</p>
                <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff">Bet Refunded</h1>
                <p style="margin:12px 0 0;font-size:36px">💸</p>
              </div>
              <div style="padding:32px 28px">
                <p style="color:#94a3b8;margin:0 0 16px">A market you bet on was abandoned without a result, so your stake has been automatically returned to your wallet.</p>
                <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:16px 20px;margin:0 0 24px">
                  <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase">Market</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#f1f5f9">${esc(market.title)}</p>
                </div>
                <div style="background:#064e3b20;border:1px solid #065f46;border-radius:12px;padding:16px 20px;margin:0 0 24px">
                  <p style="margin:0 0 4px;font-size:12px;color:#6ee7b7;text-transform:uppercase">Refunded</p>
                  <p style="margin:0;font-size:24px;font-weight:900;color:#34d399">UGX ${refund.toLocaleString()}</p>
                </div>
                ${btn(`${SITE}/markets`, '🔮 Browse open markets', '#7c3aed')}
                <p style="margin:24px 0 0;font-size:12px;color:#334155;text-align:center">
                  <a href="${SITE}" style="color:#6d28d9">sabula256.com</a>
                </p>
              </div>
            </div>
            `,
          ).catch(() => {})
        }
      }
    }

    marketsProcessed++
  }

  return NextResponse.json({ refunded: totalRefunded, markets: marketsProcessed })
}
