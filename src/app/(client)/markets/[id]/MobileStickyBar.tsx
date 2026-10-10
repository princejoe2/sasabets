'use client'
import type { MarketData, MarketOutcome } from './types'
import { oddsFor, OUTCOME_COLORS } from './types'

type Props = {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onOpen: (outcome: MarketOutcome, side: 'yes' | 'no') => void
  onSelectOutcome: (o: MarketOutcome) => void
}

export default function MobileStickyBar({
  market, outcomes, selectedOutcome, onOpen, onSelectOutcome,
}: Props) {
  const rake    = market.rake_pct ?? 0.08
  const rawOpts = Array.isArray(market.options) ? market.options : []

  const activeOutcomes = outcomes.filter(o => o.status === 'active')
  const isMulti        = activeOutcomes.length >= 3

  const target   = selectedOutcome ?? activeOutcomes[0] ?? null
  const color    = target ? OUTCOME_COLORS[target.color_index % OUTCOME_COLORS.length] : '#22C55E'
  const yesOdds  = target ? oddsFor(target, 'yes', rawOpts, rake) : '—'
  const noOdds   = target ? oddsFor(target, 'no',  rawOpts, rake) : '—'

  if (!target) return null

  return (
    <div
      className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-buy-bar lg:hidden border-t border-mk-border bg-mk-bg/95 backdrop-blur-sm px-4 py-3"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      {isMulti ? (
        /* Multi-outcome: scrollable tab row + fixed YES/NO */
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 w-max">
              {activeOutcomes.map(o => {
                const isSelected = (selectedOutcome ?? activeOutcomes[0])?.id === o.id
                const c = OUTCOME_COLORS[o.color_index % OUTCOME_COLORS.length]
                return (
                  <button
                    key={o.id}
                    onClick={() => onSelectOutcome(o)}
                    className="shrink-0 rounded-r-pill border px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] whitespace-nowrap"
                    style={isSelected
                      ? { background: `${c}20`, borderColor: `${c}66`, color: c }
                      : { background: 'var(--mk-raised)', borderColor: 'var(--mk-border)', color: 'var(--mk-muted)' }
                    }
                  >
                    {o.name.length > 12 ? o.name.slice(0, 11) + '…' : o.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => target && onOpen(target, 'yes')}
              className="rounded-r-btn border border-mk-yes bg-mk-yes-bg py-3 text-sm font-bold text-mk-yes min-h-[44px] w-[68px]"
            >
              YES
            </button>
            <button
              onClick={() => target && onOpen(target, 'no')}
              className="rounded-r-btn border border-mk-no bg-mk-no-bg py-3 text-sm font-bold text-mk-no min-h-[44px] w-[68px]"
            >
              NO
            </button>
          </div>
        </div>
      ) : (
        /* Binary: existing layout unchanged */
        <div className="flex items-center gap-2">
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
      )}
    </div>
  )
}
