import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) throw new Error('CoinGecko error')
    const data = await res.json()
    return NextResponse.json({
      price: data.bitcoin.usd as number,
      change24h: data.bitcoin.usd_24h_change as number,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch BTC price' }, { status: 503 })
  }
}
