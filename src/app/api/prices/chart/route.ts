import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const id   = req.nextUrl.searchParams.get('id') ?? 'bitcoin'
  const days = req.nextUrl.searchParams.get('days') ?? '7'

  try {
    const [chartRes, infoRes] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
        { next: { revalidate: 300 } }
      ),
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 60 } }
      ),
    ])

    if (!chartRes.ok) throw new Error('chart fetch failed')
    const chartData = await chartRes.json()
    const infoData  = infoRes.ok ? await infoRes.json() : {}

    const allPrices: [number, number][] = chartData.prices ?? []
    // Downsample to ~120 points max
    const step = Math.max(1, Math.floor(allPrices.length / 120))
    const prices = allPrices.filter((_, i) => i % step === 0)
    // Always include last point
    if (allPrices.length > 0 && prices[prices.length - 1] !== allPrices[allPrices.length - 1]) {
      prices.push(allPrices[allPrices.length - 1])
    }

    return NextResponse.json({
      prices,
      current_price: infoData[id]?.usd ?? null,
      change_24h:    infoData[id]?.usd_24h_change ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 })
  }
}
