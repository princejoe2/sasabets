import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPoolDepth } from '@/lib/pool-depth'

type Opt = { id: string; label: string; total_pool: number }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { optionId, amount } = await req.json()
  if (!optionId || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: market } = await admin
    .from('markets')
    .select('id, options, total_pool, status, closes_at, rake_pct')
    .eq('id', (await params).id)
    .single()

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open', code: 'market_not_open' }, { status: 400 })
  }

  const opts = market.options as Opt[]
  const opt = opts.find(o => o.id === optionId)
  if (!opt) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  const total = Number(market.total_pool)
  const rake = Number(market.rake_pct ?? 0.08)
  const optPool = Number(opt.total_pool)

  const newOptPool = optPool + amount
  const newTotal = total + amount

  const payout = Math.round((amount / newOptPool) * newTotal * (1 - rake))
  const profit = payout - amount
  const roi_pct = amount > 0 ? Math.round((profit / amount) * 1000) / 10 : 0

  const currentProb = total > 0 ? optPool / total : 1 / opts.length
  const newProb = newOptPool / newTotal
  const probShiftPct = Math.round(Math.abs(newProb - currentProb) * 10000) / 100

  const depthAfter = getPoolDepth(newTotal)
  const depthCurrent = getPoolDepth(total)

  let warning: string | null = null
  if (probShiftPct > 5) warning = 'large_bet_moves_market'
  else if (depthCurrent.rating === 'seed' || depthCurrent.rating === 'thin') warning = 'thin_pool_estimate_unreliable'

  return NextResponse.json({
    estimated_payout: payout,
    estimated_profit: profit,
    estimated_roi_pct: roi_pct,
    probability_if_placed: Math.round(newProb * 10000) / 10000,
    probability_current: Math.round(currentProb * 10000) / 10000,
    probability_shift_pct: probShiftPct,
    pool_depth_after: depthAfter.rating,
    pool_depth_warning: depthCurrent.warning,
    warning,
  })
}
