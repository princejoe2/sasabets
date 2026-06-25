import { NextResponse } from 'next/server'

interface RawMarket {
  id: string
  question: string
  outcomes: string | string[]
  outcomePrices: string | string[]
  volume24hr: string | number
  volume: string | number
  endDate: string
  conditionId: string
  description?: string
}

function parseArr(val: string | string[]): string[] {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

async function fetchPage(offset: number): Promise<RawMarket[]> {
  const url = new URL('https://gamma-api.polymarket.com/markets')
  url.searchParams.set('active', 'true')
  url.searchParams.set('closed', 'false')
  url.searchParams.set('limit', '100')
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('order', 'volume24hr:desc')
  const res = await fetch(url.toString(), { next: { revalidate: 120 } })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.toLowerCase().trim() ?? ''
  // Each "page" in our API covers 500 Polymarket markets (5 parallel fetches × 100)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const base = page * 500

  try {
    // Fetch 5 pages in parallel from Polymarket
    const pages = await Promise.all(
      [0, 1, 2, 3, 4].map(i => fetchPage(base + i * 100))
    )

    const raw: RawMarket[] = pages.flat()

    const filtered = raw
      .filter(m => m.question && m.conditionId)
      .filter(m => q === '' || m.question.toLowerCase().includes(q))

    const markets = filtered.map(m => {
      const outcomes     = parseArr(m.outcomes)
      const prices       = parseArr(m.outcomePrices)
      return {
        id:            m.id,
        question:      m.question,
        outcomes:      outcomes.length >= 2 ? outcomes : ['Yes', 'No'],
        outcomePrices: prices.length >= 2   ? prices   : ['0.5', '0.5'],
        volume24hr:    Number(m.volume24hr ?? 0),
        volume:        Number(m.volume ?? 0),
        endDate:       m.endDate ?? null,
        conditionId:   m.conditionId,
      }
    })

    // Tell the client whether there could be more pages
    const hasMore = raw.length === 500

    return NextResponse.json({ markets, hasMore, page })
  } catch {
    return NextResponse.json({ markets: [], hasMore: false, page }, { status: 200 })
  }
}
