import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { settleMarket } from '@/lib/settle-market'

export async function POST(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET ?? '').replace(/[^\x20-\x7E]/g, '').trim()
  const auth = req.headers.get('authorization')
  const urlSecret = req.nextUrl.searchParams.get('secret')
  if (!cronSecret || (auth !== `Bearer ${cronSecret}` && urlSecret !== cronSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { marketId } = await req.json()
  if (!marketId) return NextResponse.json({ error: 'Missing marketId' }, { status: 400 })

  const admin = createAdminClient()
  const { data: market } = await admin
    .from('markets')
    .select('id, status, closes_at, options, metadata')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (market.status !== 'open') return NextResponse.json({ skipped: true, reason: 'already settled' })

  const meta = market.metadata as Record<string, unknown> | null
  const marketType = meta?.type as string | undefined
  if (marketType !== 'updown' && marketType !== 'price_level') {
    return NextResponse.json({ skipped: true, reason: 'not an asset market' })
  }

  const closesAt = market.closes_at ? new Date(market.closes_at) : null
  if (!closesAt || closesAt > new Date()) return NextResponse.json({ skipped: true, reason: 'not expired' })

  const assetId = String(meta?.asset ?? 'bitcoin')
  const cgId    = assetId // pax-gold, bitcoin, etc. pass through directly
  let currentPrice = 0
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`, { cache: 'no-store' })
    const d = await r.json()
    currentPrice = d[cgId]?.usd ?? 0
  } catch { /* can't settle without price */ }

  if (!currentPrice) return NextResponse.json({ skipped: true, reason: 'price unavailable' })

  const options = market.options as Array<{ id: string; label: string }>
  let winner: { id: string; label: string } | undefined

  if (marketType === 'updown') {
    const entryPrice = Number(meta?.entry_price ?? 0)
    const isUp = currentPrice >= entryPrice
    winner = options.find(o => isUp ? o.label.toLowerCase().includes('up') : o.label.toLowerCase().includes('down'))
  } else {
    // price_level
    const targetPrice = Number(meta?.target_price ?? 0)
    const direction   = String(meta?.direction ?? 'above')
    const isYes       = direction === 'above' ? currentPrice >= targetPrice : currentPrice <= targetPrice
    winner = options.find(o => isYes ? o.id === 'opt-yes' : o.id === 'opt-no')
  }

  if (!winner) return NextResponse.json({ skipped: true, reason: 'no matching option' })

  await settleMarket(admin, market.id, winner.id)
  return NextResponse.json({ settled: true, asset: assetId, currentPrice, winner: winner.label })
}
