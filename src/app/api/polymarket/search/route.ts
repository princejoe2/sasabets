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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase().trim() ?? ''

  try {
    // Fetch top 100 active markets by 24hr volume — filter client-side
    const url = new URL('https://gamma-api.polymarket.com/markets')
    url.searchParams.set('active', 'true')
    url.searchParams.set('closed', 'false')
    url.searchParams.set('limit', '100')
    url.searchParams.set('order', 'volume24hr:desc')

    const res = await fetch(url.toString(), { next: { revalidate: 120 } })
    if (!res.ok) throw new Error('Polymarket error')

    const raw: RawMarket[] = await res.json()

    const markets = raw
      .filter(m => m.question && m.conditionId)
      .filter(m => q === '' || m.question.toLowerCase().includes(q))
      .slice(0, 20)
      .map(m => {
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

    return NextResponse.json(markets)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
