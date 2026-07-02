import { NextResponse } from 'next/server'

interface KalshiMarket {
  ticker: string
  event_ticker: string
  title: string
  yes_bid: number
  no_bid: number
  last_price: number
  volume: number
  volume_24h: number
  close_time: string | null
  status: string
  market_type: string
}

interface KalshiResponse {
  cursor?: string
  markets?: KalshiMarket[]
}

const BASE = 'https://trading-api.kalshi.com/trade-api/v2'

async function fetchPage(cursor: string): Promise<{ markets: KalshiMarket[]; nextCursor: string }> {
  const url = new URL(`${BASE}/markets`)
  url.searchParams.set('status', 'open')
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
      .map(m => ({
        ticker:    m.ticker,
        title:     m.title,
        yesBid:    m.yes_bid   ?? Math.round((m.last_price ?? 50)),
        noBid:     m.no_bid    ?? (100 - Math.round(m.last_price ?? 50)),
        volume:    m.volume    ?? 0,
        volume24h: m.volume_24h ?? 0,
        closeTime: m.close_time ?? null,
      }))

    return NextResponse.json({ markets, cursor: nextCursor, hasMore: !!nextCursor })
  } catch {
    return NextResponse.json({ markets: [], cursor: '', hasMore: false }, { status: 200 })
  }
}
