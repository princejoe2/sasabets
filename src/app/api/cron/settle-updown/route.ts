import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { settleMarket } from '@/lib/settle-market'

// Called by Vercel Cron or manually: GET /api/cron/settle-updown
// Add to vercel.json: { "crons": [{ "path": "/api/cron/settle-updown", "schedule": "* * * * *" }] }
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Find all open updown markets that have passed their close time
  const { data: expired } = await admin
    .from('markets')
    .select('id, metadata, options')
    .eq('status', 'open')
    .lt('closes_at', new Date().toISOString())

  const updownExpired = (expired ?? []).filter(
    m => (m.metadata as Record<string, unknown>)?.type === 'updown'
  )

  if (updownExpired.length === 0) {
    return NextResponse.json({ settled: 0 })
  }

  // Fetch current prices for all unique assets
  const assetSet: Record<string, true> = {}
  updownExpired.forEach(m => { assetSet[String((m.metadata as Record<string, unknown>).asset)] = true })
  const assetIds = Object.keys(assetSet)
  let prices: Record<string, number> = {}
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetIds.join(',')}&vs_currencies=usd`)
    const data = await r.json()
    prices = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as { usd: number }).usd]))
  } catch {
    return NextResponse.json({ error: 'CoinGecko fetch failed' }, { status: 502 })
  }

  let settled = 0
  for (const market of updownExpired) {
    const meta       = market.metadata as Record<string, unknown>
    const assetId    = String(meta.asset)
    const entryPrice = Number(meta.entry_price ?? 0)
    const current    = prices[assetId]
    if (!current || !entryPrice) continue

    const opts      = market.options as Array<{ id: string; label: string }>
    const upOpt     = opts.find(o => o.id === 'opt-up')
    const downOpt   = opts.find(o => o.id === 'opt-down')
    if (!upOpt || !downOpt) continue

    const winningOptionId = current > entryPrice ? upOpt.id : downOpt.id
    const result = await settleMarket(admin, market.id, winningOptionId)
    if (result.success) settled++
    else console.error(`settle-updown: failed for ${market.id}:`, result.error)
  }

  return NextResponse.json({ settled, checked: updownExpired.length })
}
