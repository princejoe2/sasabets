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
  { params }: { params: { id: string } },
) {
  const admin = createAdminClient()
  const marketId = params.id

  const { data: market } = await admin
    .from('markets')
    .select('options, total_pool, created_at')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ points: [] })

  const opts = market.options as { id: string; label: string; total_pool: number }[]
  if (opts.length < 2) return NextResponse.json({ points: [] })

  const optAId = opts[0].id
  const optBId = opts[1].id

  const { data: bets } = await admin
    .from('bets')
    .select('option_id, amount, placed_at')
    .eq('market_id', marketId)
    .order('placed_at', { ascending: true })

  if (!bets || bets.length === 0) {
    return NextResponse.json({
      points: [{ t: market.created_at, pA: 50, pB: 50, pool: 0 }],
    })
  }

  let poolA = 0
  let poolB = 0
  const points: { t: string; pA: number; pB: number; pool: number }[] = []
  points.push({ t: market.created_at, pA: 50, pB: 50, pool: 0 })

  for (const bet of bets) {
    if (bet.option_id === optAId) poolA += Number(bet.amount)
    else if (bet.option_id === optBId) poolB += Number(bet.amount)
    const total = poolA + poolB
    const pA = total > 0 ? (poolA / total) * 100 : 50
    points.push({ t: bet.placed_at, pA, pB: 100 - pA, pool: total })
  }

  const sampled = downsample(points, 120)

  return NextResponse.json({ points: sampled }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  })
}
