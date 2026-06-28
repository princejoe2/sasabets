import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPoolDepth } from '@/lib/pool-depth'

type Opt = { id: string; label: string; total_pool: number }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient()
  const { id } = params

  const [{ data: market }, { count: bettorCount }] = await Promise.all([
    admin.from('markets').select('id, options, total_pool, status, probability_at_close, last_bet_at, closes_at').eq('id', id).single(),
    admin.from('bets').select('id', { count: 'exact', head: true }).eq('market_id', id).neq('status', 'exited'),
  ])

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  const opts = market.options as Opt[]
  const total = Number(market.total_pool)
  const depth = getPoolDepth(total)

  // Probability — use probability_at_close once market is closed/settled
  const useClosed = ['closed', 'settling', 'settled'].includes(market.status) && market.probability_at_close != null

  const probs = opts.map(opt => ({
    id: opt.id,
    label: opt.label,
    pool: Number(opt.total_pool),
    probability: useClosed
      ? (opt === opts[0] ? Number(market.probability_at_close) : 1 - Number(market.probability_at_close))
      : (total > 0 ? Number(opt.total_pool) / total : 1 / opts.length),
  }))

  // Payout estimate for 1,000 UGX on each option (simulate post-bet)
  const SAMPLE = 1000
  const implied = opts.map(opt => {
    const optPool = Number(opt.total_pool)
    const newOptPool = optPool + SAMPLE
    const newTotal = total + SAMPLE
    if (newOptPool <= 0) return 0
    return Math.floor((SAMPLE / newOptPool) * newTotal * 0.92)
  })

  return NextResponse.json({
    market_id: id,
    status: market.status,
    total_pool: total,
    bettor_count: bettorCount ?? 0,
    last_bet_at: market.last_bet_at,
    pool_depth_rating: depth.rating,
    pool_depth_label: depth.label,
    pool_depth_warning: depth.warning,
    options: probs.map((p, i) => ({
      id: p.id,
      label: p.label,
      pool: p.pool,
      probability: p.probability,
      implied_payout_per_1k: implied[i],
    })),
  })
}
