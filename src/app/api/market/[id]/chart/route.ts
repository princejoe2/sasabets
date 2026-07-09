import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 30

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr
  const step = (arr.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, i) => arr[Math.round(i * step)])
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = createAdminClient()
  const marketId = (await params).id

  const { data: market } = await admin
    .from('markets')
    .select('options, total_pool, created_at')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ points: [], options: [] })

  const opts = market.options as { id: string; label: string; total_pool: number }[]
  if (opts.length < 2) return NextResponse.json({ points: [], options: [] })

  const { data: bets } = await admin
    .from('bets')
    .select('option_id, amount, placed_at')
    .eq('market_id', marketId)
    .order('placed_at', { ascending: true })

  const optLabels = opts.map(o => o.label)

  // Build initial point — equal probability for all options
  const equalPct = 100 / opts.length
  const makeInitial = () => {
    const row: Record<string, number | string> = { t: market.created_at, pool: 0 }
    opts.forEach(o => { row[o.label] = equalPct })
    return row
  }

  if (!bets || bets.length === 0) {
    return NextResponse.json({
      points: [makeInitial()],
      options: optLabels,
    })
  }

  // Running pools per option
  const pools: Record<string, number> = {}
  opts.forEach(o => { pools[o.id] = 0 })

  const points: Record<string, number | string>[] = []
  points.push(makeInitial())

  for (const bet of bets) {
    if (pools[bet.option_id] !== undefined) {
      pools[bet.option_id] += Number(bet.amount)
    }
    const total = Object.values(pools).reduce((s, v) => s + v, 0)
    const row: Record<string, number | string> = { t: bet.placed_at, pool: total }
    opts.forEach(o => {
      row[o.label] = total > 0 ? (pools[o.id] / total) * 100 : equalPct
    })
    points.push(row)
  }

  const sampled = downsample(points, 120)

  return NextResponse.json({ points: sampled, options: optLabels }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  })
}
