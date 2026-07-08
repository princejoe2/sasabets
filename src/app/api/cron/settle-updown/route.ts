import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { settleMarket } from '@/lib/settle-market'

// Called by Vercel Cron or manually: GET /api/cron/settle-updown
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const authHeader = req.headers.get('authorization')
  const urlSecret  = req.nextUrl.searchParams.get('secret')
  if (authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: expired } = await admin
    .from('markets')
    .select('id, metadata, options')
    .eq('status', 'open')
    .lt('closes_at', new Date().toISOString())

  const assetExpired = (expired ?? []).filter(m => {
    const t = (m.metadata as Record<string, unknown>)?.type
    return t === 'updown' || t === 'price_level'
  })

  if (assetExpired.length === 0) {
    return NextResponse.json({ settled: 0 })
  }

  // Fetch current prices for all unique assets
  const assetSet: Record<string, true> = {}
  assetExpired.forEach(m => { assetSet[String((m.metadata as Record<string, unknown>).asset)] = true })
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
  for (const market of assetExpired) {
    const meta    = market.metadata as Record<string, unknown>
    const assetId = String(meta.asset)
    const current = prices[assetId]
    if (!current) continue

    const opts = market.options as Array<{ id: string; label: string }>
    let winningOptionId: string | undefined

    if (meta.type === 'updown') {
      const entryPrice = Number(meta.entry_price ?? 0)
      if (!entryPrice) continue
      const upOpt   = opts.find(o => o.id === 'opt-up')
      const downOpt = opts.find(o => o.id === 'opt-down')
      if (!upOpt || !downOpt) continue
      winningOptionId = current > entryPrice ? upOpt.id : downOpt.id
    } else {
      // price_level
      const targetPrice = Number(meta.target_price ?? 0)
      const direction   = String(meta.direction ?? 'above')
      if (!targetPrice) continue
      const yesOpt = opts.find(o => o.id === 'opt-yes')
      const noOpt  = opts.find(o => o.id === 'opt-no')
      if (!yesOpt || !noOpt) continue
      const isYes = direction === 'above' ? current >= targetPrice : current <= targetPrice
      winningOptionId = isYes ? yesOpt.id : noOpt.id
    }

    if (!winningOptionId) continue
    const result = await settleMarket(admin, market.id, winningOptionId)
    if (result.success) settled++
    else console.error(`settle-updown: failed for ${market.id}:`, result.error)
  }

  return NextResponse.json({ settled, checked: assetExpired.length })
}
