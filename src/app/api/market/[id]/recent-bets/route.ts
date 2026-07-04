import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// No ISR — bets arrive in real time
export const dynamic = 'force-dynamic'

type Opt = { id: string; label: string; total_pool: number }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = createAdminClient()
  const marketId = (await params).id

  // Resolve option labels from the market JSONB
  const { data: market } = await admin
    .from('markets')
    .select('options')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ bets: [], unique_predictors: 0 })

  const opts = (market.options ?? []) as Opt[]
  const optionMap: Record<string, string> = {}
  for (const o of opts) optionMap[o.id] = o.label

  // Fetch recent bets + all user_ids for unique predictor count
  const [{ data: recentBets }, { data: allBets }] = await Promise.all([
    admin
      .from('bets')
      .select('id, amount, placed_at, option_id, user_id')
      .eq('market_id', marketId)
      .neq('status', 'cancelled')
      .order('placed_at', { ascending: false })
      .limit(10),
    admin
      .from('bets')
      .select('user_id')
      .eq('market_id', marketId)
      .neq('status', 'cancelled'),
  ])

  const uniquePredictors = new Set((allBets ?? []).map(b => b.user_id)).size

  if (!recentBets || recentBets.length === 0) {
    return NextResponse.json({ bets: [], unique_predictors: uniquePredictors })
  }

  // Anonymise: show phone last 4 digits if available, else "a predictor"
  const userIds = Array.from(new Set(recentBets.map(b => b.user_id)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, phone')
    .in('id', userIds)

  const phoneMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    if (p.phone) {
      const last4 = String(p.phone).replace(/\D/g, '').slice(-4)
      if (last4.length === 4) phoneMap[p.id] = `****${last4}`
    }
  }

  const result = recentBets.map(b => ({
    id: b.id,
    amount: Number(b.amount),
    placed_at: b.placed_at,
    option_label: optionMap[b.option_id] ?? 'Unknown',
    predictor: phoneMap[b.user_id] ?? null,
  }))

  return NextResponse.json(
    { bets: result, unique_predictors: uniquePredictors },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
