import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 300 } } // 5-minute cache — rate changes slowly
    )
    if (!res.ok) throw new Error('ER-API error')
    const data = await res.json()
    if (data.result !== 'success') throw new Error('Bad response')
    return NextResponse.json({
      ugx: data.rates.UGX as number,
      kes: data.rates.KES as number,
      tzs: data.rates.TZS as number,
      updatedAt: data.time_last_update_utc as string,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 503 })
  }
}
