import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { settleMarket } from '@/lib/settle-market'

export async function POST(req: NextRequest) {
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
  if (meta?.type !== 'updown') return NextResponse.json({ skipped: true, reason: 'not updown' })

  const closesAt = market.closes_at ? new Date(market.closes_at) : null
  if (!closesAt || closesAt > new Date()) return NextResponse.json({ skipped: true, reason: 'not expired' })

  const assetId    = String(meta.asset ?? 'bitcoin')
  const entryPrice = Number(meta.entry_price ?? 0)

  const ids: Record<string, string> = {
    bitcoin: 'bitcoin', ethereum: 'ethereum', solana: 'solana',
    binancecoin: 'binancecoin', ripple: 'ripple',
  }
  const cgId = ids[assetId] ?? assetId
  let currentPrice = 0
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`, { cache: 'no-store' })
    const d = await r.json()
    currentPrice = d[cgId]?.usd ?? 0
  } catch { /* fall through — can't settle without price */ }

  if (!currentPrice) return NextResponse.json({ skipped: true, reason: 'price unavailable' })

  const isUp    = currentPrice >= entryPrice
  const options = market.options as Array<{ id: string; label: string }>
  const winner  = options.find(o => isUp ? o.label.toLowerCase().includes('up') : o.label.toLowerCase().includes('down'))
  if (!winner) return NextResponse.json({ skipped: true, reason: 'no matching option' })

  await settleMarket(market.id, winner.id, admin)
  return NextResponse.json({ settled: true, asset: assetId, entryPrice, currentPrice, winner: winner.label })
}
