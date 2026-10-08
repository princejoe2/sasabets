'use client'
import type { MarketData, MarketOutcome } from './types'
import { oddsFor, OUTCOME_COLORS } from './types'

type Props = {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onOpen: (outcome: MarketOutcome, side: 'yes' | 'no') => void
}

export default function MobileStickyBar({
  market, outcomes, selectedOutcome, onOpen,
}: Props) {
  const rake    = market.rake_pct ?? 0.08
  const rawOpts = Array.isArray(market.options) ? market.options : []

  const target   = selectedOutcome ?? outcomes.find(o => o.status === 'active') ?? null
  const color    = target ? OUTCOME_COLORS[target.color_index % OUTCOME_COLORS.length] : '#22C55E'
  const yesOdds  = target ? oddsFor(target, 'yes', rawOpts, rake) : '—'
  const noOdds   = target ? oddsFor(target, 'no',  rawOpts, rake) : '—'

  if (!target) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-mk-border bg-mk-bg/95 backdrop-blur-sm px-4 py-3"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2">
        {/* Outcome name pill */}
        <div
          className="hidden xs:flex shrink-0 h-8 w-8 rounded-full items-center justify-center text-xs font-bold"
          style={{ background: `${color}20`, color }}
        >
          {target.name.slice(0, 2).toUpperCase()}
        </div>
        <p className="flex-1 text-xs font-medium text-mk-secondary truncate hidden sm:block">
          {target.name}
        </p>

        <button
          onClick={() => onOpen(target, 'yes')}
          className="flex-1 rounded-r-btn border border-mk-yes bg-mk-yes-bg py-3 text-sm font-bold text-mk-yes min-h-[44px]"
        >
          Yes{yesOdds !== '—' ? ` ${yesOdds}` : ''}
        </button>
        <button
          onClick={() => onOpen(target, 'no')}
          className="flex-1 rounded-r-btn border border-mk-no bg-mk-no-bg py-3 text-sm font-bold text-mk-no min-h-[44px]"
        >
          No{noOdds !== '—' ? ` ${noOdds}` : ''}
        </button>
      </div>
    </div>
  )
}
