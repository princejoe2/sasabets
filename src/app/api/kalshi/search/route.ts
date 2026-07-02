import { NextResponse } from 'next/server'

interface KalshiMarket {
  ticker: string
  event_ticker: string
  title: string
  yes_bid_dollars: string
  no_bid_dollars: string
  last_price_dollars: string
  volume_fp: string
  volume_24h_fp: string
  close_time: string | null
  status: string
  market_type: string
}

interface KalshiResponse {
  cursor?: string
  markets?: KalshiMarket[]
}

const BASE = 'https://api.elections.kalshi.com/trade-api/v2'

async function fetchPage(cursor: string): Promise<{ markets: KalshiMarket[]; nextCursor: string }> {
  const url = new URL(`${BASE}/markets`)
  url.searchParams.set('status', 'active')
  url.searchParams.set('limit', '200')
  if (cursor) url.searchParams.set('cursor', cursor)

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 120 },
  })
  if (!res.ok) return { markets: [], nextCursor: '' }

  const data: KalshiResponse = await res.json()
  return {
    markets:    Array.isArray(data.markets) ? data.markets : [],
    nextCursor: data.cursor ?? '',
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.toLowerCase().trim() ?? ''
  const cursor = searchParams.get('cursor') ?? ''

  try {
    const { markets: raw, nextCursor } = await fetchPage(cursor)

    const markets = raw
      .filter(m => m.market_type === 'binary' && m.title)
      .filter(m => q === '' || m.title.toLowerCase().includes(q))
      .map(m => {
        const yesBid = Math.round(parseFloat(m.yes_bid_dollars ?? '0') * 100)
        const noBid  = Math.round(parseFloat(m.no_bid_dollars  ?? '0') * 100)
        const last   = Math.round(parseFloat(m.last_price_dollars ?? '0.5') * 100)
        return {
          ticker:    m.ticker,
          title:     m.title,
          yesBid:    yesBid || last || 50,
          noBid:     noBid  || (100 - (last || 50)),
          volume:    Math.round(parseFloat(m.volume_fp    ?? '0')),
          volume24h: Math.round(parseFloat(m.volume_24h_fp ?? '0')),
          closeTime: m.close_time ?? null,
        }
      })

    return NextResponse.json({ markets, cursor: nextCursor, hasMore: !!nextCursor })
  } catch {
    return NextResponse.json({ markets: [], cursor: '', hasMore: false }, { status: 200 })
  }
}
