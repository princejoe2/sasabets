import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 30

const RANGE_MAP: Record<string, string> = {
  '1H':  '1 hour',
  '6H':  '6 hours',
  '1D':  '1 day',
  '1W':  '7 days',
  '1M':  '30 days',
  'ALL': '100 years',
}

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr
  const step = (arr.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, i) => arr[Math.round(i * step)])
}

function parseSql(interval: string): number {
  if (interval === '100 years') return 100 * 365 * 86_400_000
  if (interval.includes('hour'))  return parseInt(interval) * 3_600_000
  if (interval.includes('day'))   return parseInt(interval) * 86_400_000
  return 100 * 365 * 86_400_000
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin    = createAdminClient()
  const marketId = (await params).id
  const range    = req.nextUrl.searchParams.get('range') ?? 'ALL'
  const interval = RANGE_MAP[range] ?? '100 years'

  const [{ data: market }, { data: outcomes }] = await Promise.all([
    admin.from('markets').select('options, total_pool, created_at').eq('id', marketId).single(),
    admin.from('market_outcomes').select('id, slug, name, color_index, status')
      .eq('market_id', marketId).order('sort_order'),
  ])

  if (!market) return NextResponse.json({ points: [], options: [], top4: [] })

  const rawOpts = market.options as { id: string; label: string; total_pool: number }[]
  const allOpts = Array.isArray(rawOpts) ? rawOpts : []

  // Fallback to synthetic outcomes if market_outcomes is empty
  const effectiveOutcomes = outcomes && outcomes.length > 0
    ? outcomes
    : allOpts
        .filter(o => !o.id.endsWith('_no'))
        .map((o, i) => ({
          id: `synthetic-${o.id}`,
          slug: o.id.replace(/_yes$/, ''),
          name: o.label.replace(/\s+(YES|Yes)$/, '').trim(),
          color_index: i,
          status: 'active',
        }))

  const activeOutcomes = effectiveOutcomes.filter(o => o.status !== 'eliminated')
  if (activeOutcomes.length === 0) return NextResponse.json({ points: [], options: [], top4: [] })

  // Try outcome_price_history first (real DB rows only, not synthetic)
  const outcomeIds = activeOutcomes
    .filter(o => !o.id.startsWith('synthetic-'))
    .map(o => o.id)

  let useHistory = false
  let historyPoints: Record<string, string | number>[] = []

  if (outcomeIds.length > 0) {
    const since = new Date(Date.now() - parseSql(interval)).toISOString()
    const { data: history } = await admin
      .from('outcome_price_history')
      .select('outcome_id, probability, recorded_at')
      .in('outcome_id', outcomeIds)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })

    if (history && history.length >= 2) {
      useHistory = true
      const timeMap = new Map<string, Record<string, number>>()
      for (const row of history) {
        const bucket = row.recorded_at as string
        if (!timeMap.has(bucket)) timeMap.set(bucket, {})
        const outcome = activeOutcomes.find(o => o.id === row.outcome_id)
        if (outcome) timeMap.get(bucket)![outcome.name] = Math.round(Number(row.probability) * 100)
      }
      const lastKnown: Record<string, number> = {}
      for (const [t, vals] of timeMap) {
        const merged = { ...lastKnown, ...vals }
        Object.assign(lastKnown, merged)
        historyPoints.push({ t, ...merged })
      }
    }
  }

  if (useHistory) {
    const sampled  = downsample(historyPoints, 200)
    const optNames = activeOutcomes.map(o => o.name)
    const latest   = sampled[sampled.length - 1] ?? {}
    const top4     = [...optNames].sort((a, b) => Number(latest[b] ?? 0) - Number(latest[a] ?? 0)).slice(0, 4)
    return NextResponse.json({ points: sampled, options: optNames, top4 }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    })
  }

  // Fallback: compute from bets rows (existing logic, extended for multi-candidate)
  const isBinary = activeOutcomes.every(o => ['yes','no','up','down'].includes(o.slug))
  const equalPct = 100 / activeOutcomes.length

  const makeInitial = () => {
    const row: Record<string, number | string> = { t: market.created_at }
    activeOutcomes.forEach(o => { row[o.name] = equalPct })
    return row
  }

  const { data: bets } = await admin
    .from('bets')
    .select('option_id, amount, placed_at')
    .eq('market_id', marketId)
    .order('placed_at', { ascending: true })

  if (!bets || bets.length === 0) {
    return NextResponse.json({
      points:  [makeInitial()],
      options: activeOutcomes.map(o => o.name),
      top4:    activeOutcomes.slice(0, 4).map(o => o.name),
    })
  }

  // Running sub-pools per outcome
  const pools: Record<string, { yes: number; no: number }> = {}
  activeOutcomes.forEach(o => { pools[o.slug] = { yes: 0, no: 0 } })

  const points: Record<string, number | string>[] = [makeInitial()]

  for (const bet of bets) {
    const optId = bet.option_id as string
    if (isBinary) {
      if (pools[optId]) pools[optId].yes += Number(bet.amount)
    } else {
      const isYes = optId.endsWith('_yes')
      const slug  = isYes ? optId.slice(0, -4) : optId.slice(0, -3)
      if (pools[slug]) {
        if (isYes) pools[slug].yes += Number(bet.amount)
        else       pools[slug].no  += Number(bet.amount)
      }
    }
    const totalAll = Object.values(pools).reduce((s, p) => s + p.yes + p.no, 0)
    const row: Record<string, number | string> = { t: bet.placed_at }
    for (const o of activeOutcomes) {
      const p   = pools[o.slug]
      const sub = p.yes + p.no
      if (isBinary) {
        row[o.name] = totalAll > 0 ? Math.round((p.yes / totalAll) * 100) : equalPct
      } else {
        row[o.name] = sub > 0 ? Math.round((p.yes / sub) * 100) : 50
      }
    }
    points.push(row)
  }

  const sampled  = downsample(points, 200)
  const optNames = activeOutcomes.map(o => o.name)
  const latest   = sampled[sampled.length - 1] ?? {}
  const top4     = [...optNames].sort((a, b) => Number(latest[b] ?? 0) - Number(latest[a] ?? 0)).slice(0, 4)

  return NextResponse.json({ points: sampled, options: optNames, top4 }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  })
}
