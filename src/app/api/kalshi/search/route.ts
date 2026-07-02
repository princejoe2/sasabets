import { NextResponse } from 'next/server'

interface KalshiNestedMarket {
  ticker: string
  title: string
  yes_bid_dollars: string
  no_bid_dollars: string
  last_price_dollars: string
  volume_fp: string
  volume_24h_fp: string
  close_time: string | null
  market_type: string
  mve_collection_ticker?: string
}

interface KalshiEvent {
  event_ticker: string
  title: string
  markets: KalshiNestedMarket[]
}

interface KalshiEventsResponse {
  cursor?: string
  events?: KalshiEvent[]
}

const BASE = 'https://api.elections.kalshi.com/trade-api/v2'

async function fetchPage(cursor: string): Promise<{ events: KalshiEvent[]; nextCursor: string }> {
  const url = new URL(`${BASE}/events`)
  url.searchParams.set('status', 'open')
  url.searchParams.set('limit', '200')
  url.searchParams.set('with_nested_markets', 'true')
  if (cursor) url.searchParams.set('cursor', cursor)

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 120 },
  })
  if (!res.ok) return { events: [], nextCursor: '' }

  const data: KalshiEventsResponse = await res.json()
  return {
    events:    Array.isArray(data.events) ? data.events : [],
    nextCursor: data.cursor ?? '',
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.toLowerCase().trim() ?? ''
  const cursor = searchParams.get('cursor') ?? ''

  try {
    const { events, nextCursor } = await fetchPage(cursor)

    const markets = events
      .filter(e => {
        const m = e.markets?.[0]
        return m && m.market_type === 'binary' && !m.mve_collection_ticker && e.title
      })
      .filter(e => q === '' || e.title.toLowerCase().includes(q))
      .map(e => {
        const m = e.markets[0]
        const yesBid = Math.round(parseFloat(m.yes_bid_dollars ?? '0') * 100)
        const noBid  = Math.round(parseFloat(m.no_bid_dollars  ?? '0') * 100)
        const last   = Math.round(parseFloat(m.last_price_dollars ?? '0.5') * 100)
        return {
          ticker:    m.ticker,
          title:     e.title,
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
