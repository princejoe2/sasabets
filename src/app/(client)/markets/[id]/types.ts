export type MarketOutcome = {
  id: string
  market_id: string
  slug: string
  name: string
  image_url: string | null
  image_source: string | null
  image_credit: string | null
  image_override: boolean
  image_needs_review: boolean
  sort_order: number
  status: 'active' | 'resolved_yes' | 'resolved_no' | 'eliminated'
  color_index: number
  probability: number | null
}

export type OptionRow = {
  id: string
  label: string
  total_pool: number
}

export type MarketData = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: OptionRow[]
  closes_at: string | null
  status: string
  rake_pct: number
  winning_option_id: string | null
  settlement_evidence_url: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

// The option ID to pass to place_bet for a given outcome + side
export function resolveOptionId(outcome: MarketOutcome, side: 'yes' | 'no'): string {
  if (['yes', 'no', 'up', 'down'].includes(outcome.slug)) {
    // Binary market — option ID is the slug itself
    return outcome.slug
  }
  return `${outcome.slug}_${side}`
}

// Sub-pool for an outcome (yes + no options)
export function outcomeSubPool(
  outcome: MarketOutcome,
  options: OptionRow[],
): { yes: number; no: number; total: number } {
  if (['yes', 'no', 'up', 'down'].includes(outcome.slug)) {
    const opt       = options.find(o => o.id === outcome.slug)
    const yes       = Number(opt?.total_pool ?? 0)
    const mktTotal  = options.reduce((s, o) => s + Number(o.total_pool), 0)
    // Prize pool is the entire market; no=0 so the NO button shows '—' on binary outcomes
    return { yes, no: 0, total: mktTotal }
  }
  const yesOpt = options.find(o => o.id === `${outcome.slug}_yes`)
  const noOpt  = options.find(o => o.id === `${outcome.slug}_no`)
  const yes    = Number(yesOpt?.total_pool ?? 0)
  const no     = Number(noOpt?.total_pool ?? 0)
  return { yes, no, total: yes + no }
}

// Payout multiplier for a given outcome + side
export function oddsFor(
  outcome: MarketOutcome,
  side: 'yes' | 'no',
  options: OptionRow[],
  rake: number,
): string {
  const { yes, no, total } = outcomeSubPool(outcome, options)
  const sidePool  = side === 'yes' ? yes : no
  if (total <= 0 || sidePool <= 0) return '—'
  const prize = total * (1 - rake)
  return (prize / sidePool).toFixed(2) + 'x'
}

// Current probability percentage for the "yes" side of an outcome
export function outcomeYesPct(outcome: MarketOutcome, options: OptionRow[]): number {
  if (['yes', 'no', 'up', 'down'].includes(outcome.slug)) {
    const totalPool = options.reduce((s, o) => s + Number(o.total_pool), 0)
    const opt = options.find(o => o.id === outcome.slug)
    return totalPool > 0 ? (Number(opt?.total_pool ?? 0) / totalPool) * 100 : 50
  }
  const { yes, total } = outcomeSubPool(outcome, options)
  return total > 0 ? (yes / total) * 100 : 50
}

export const OUTCOME_COLORS = [
  '#F5B83D', // amber
  '#EC4899', // pink
  '#3B82F6', // blue
  '#22C55E', // green
  '#A855F7', // purple
  '#F97316', // orange
  '#14B8A6', // teal
  '#EAB308', // yellow
] as const
