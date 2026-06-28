import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Vercel cron auth
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const ninetyMinLater = new Date(now.getTime() + 90 * 60 * 1000).toISOString()
  const fifteenMinAgo  = new Date(now.getTime() - 15 * 60 * 1000).toISOString()

  // Markets closing within 90 minutes that are still open
  const { data: markets } = await admin
    .from('markets')
    .select('id, title, total_pool, status')
    .eq('status', 'open')
    .lte('closes_at', ninetyMinLater)
    .gte('closes_at', now.toISOString())

  if (!markets || markets.length === 0) {
    return NextResponse.json({ checked: 0 })
  }

  const results: Array<{ marketId: string; action: string; shiftPct?: number }> = []

  for (const market of markets) {
    // Snapshot from 15 minutes ago
    const { data: snap } = await admin
      .from('pool_depth_snapshots')
      .select('total_pool')
      .eq('market_id', market.id)
      .lte('snapshot_at', fifteenMinAgo)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!snap || Number(snap.total_pool) === 0) continue

    const currentPool = Number(market.total_pool)
    const snapPool    = Number(snap.total_pool)
    const shiftPct    = Math.abs((currentPool - snapPool) / snapPool) * 100

    if (shiftPct < 15) continue

    // Find top bettor in last 15 minutes
    const { data: topBets } = await admin
      .from('bets')
      .select('user_id, amount')
      .eq('market_id', market.id)
      .gte('placed_at', fifteenMinAgo)
      .order('amount', { ascending: false })
      .limit(1)

    const topBettor = topBets?.[0]

    if (shiftPct >= 40) {
      // Suspend market
      await admin.from('markets')
        .update({ status: 'suspended' })
        .eq('id', market.id)
        .eq('status', 'open')

      await admin.from('market_events').insert({
        market_id: market.id,
        event_type: 'market_suspended',
        event_data: {
          shift_pct: Math.round(shiftPct * 10) / 10,
          pool_before: snapPool,
          pool_after: currentPool,
          top_bettor_id: topBettor?.user_id ?? null,
          top_bet_amount: topBettor?.amount ?? null,
        },
      })

      await admin.from('audit_log').insert({
        entity_type: 'market', action: 'suspended_surge',
        entity_id: market.id, actor_type: 'system',
        payload: { shiftPct: Math.round(shiftPct * 10) / 10, snapPool, currentPool },
      })

      results.push({ marketId: market.id, action: 'suspended', shiftPct })

    } else {
      // 15–39% shift: flag but don't suspend
      await admin.from('markets')
        .update({ surge_flag: true })
        .eq('id', market.id)

      await admin.from('market_events').insert({
        market_id: market.id,
        event_type: 'surge_detected',
        event_data: {
          shift_pct: Math.round(shiftPct * 10) / 10,
          pool_before: snapPool,
          pool_after: currentPool,
          top_bettor_id: topBettor?.user_id ?? null,
          top_bet_amount: topBettor?.amount ?? null,
        },
        actor_id: topBettor?.user_id ?? undefined,
      })

      if (topBettor) {
        await admin.from('account_flags').insert({
          user_id: topBettor.user_id,
          flag_type: 'surge_bet',
          market_id: market.id,
          details: {
            shift_pct: Math.round(shiftPct * 10) / 10,
            bet_amount: topBettor.amount,
          },
        })
      }

      await admin.from('audit_log').insert({
        entity_type: 'market', action: 'surge_flagged',
        entity_id: market.id, actor_type: 'system',
        payload: { shiftPct: Math.round(shiftPct * 10) / 10, snapPool, currentPool },
      })

      results.push({ marketId: market.id, action: 'flagged', shiftPct })
    }
  }

  // Take hourly snapshot for all open markets (idempotent — just overwrites)
  const { data: allOpen } = await admin
    .from('markets')
    .select('id, total_pool')
    .eq('status', 'open')

  if (allOpen && allOpen.length > 0) {
    // Count bettors per market
    const marketIds = allOpen.map(m => m.id)
    const { data: betCounts } = await admin
      .from('bets')
      .select('market_id')
      .in('market_id', marketIds)
      .neq('status', 'exited')

    const countMap: Record<string, number> = {}
    for (const row of betCounts ?? []) {
      countMap[row.market_id] = (countMap[row.market_id] ?? 0) + 1
    }

    await admin.from('pool_depth_snapshots').insert(
      allOpen.map(m => ({
        market_id: m.id,
        total_pool: m.total_pool,
        bettor_count: countMap[m.id] ?? 0,
        trigger_type: 'hourly',
      }))
    )
  }

  return NextResponse.json({ checked: markets.length, actions: results })
}
