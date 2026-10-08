'use client'
import { useState } from 'react'
import type { MarketData, MarketOutcome } from './types'
import { outcomeYesPct, oddsFor, OUTCOME_COLORS } from './types'

type Props = {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onSelect: (outcome: MarketOutcome, side: 'yes' | 'no') => void
  onMobileSelect: (outcome: MarketOutcome, side: 'yes' | 'no') => void
}

function OutcomeSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 py-3 px-4 border-b border-mk-border">
      <div className="h-10 w-10 rounded-full bg-mk-raised shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-mk-raised" />
        <div className="h-3 w-20 rounded bg-mk-raised" />
      </div>
      <div className="h-7 w-16 rounded bg-mk-raised" />
      <div className="h-7 w-16 rounded bg-mk-raised" />
    </div>
  )
}

export default function OutcomeList({
  market, outcomes, selectedOutcome, selectedSide, onSelect, onMobileSelect,
}: Props) {
  const [resolvedExpanded, setResolvedExpanded] = useState(false)
  const rake    = market.rake_pct ?? 0.08
  const rawOpts = Array.isArray(market.options) ? market.options : []

  const activeOutcomes = [...outcomes.filter(o => o.status === 'active')]
    .sort((a, b) => outcomeYesPct(b, rawOpts) - outcomeYesPct(a, rawOpts))
  const resolvedOutcomes = outcomes.filter(o => o.status !== 'active')

  if (outcomes.length === 0) {
    return (
      <div className="rounded-r-card border border-mk-border bg-mk-card mb-4 overflow-hidden">
        {[1,2].map(i => <OutcomeSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="rounded-r-card border border-mk-border bg-mk-card mb-4 overflow-hidden">
      {activeOutcomes.map(outcome => {
        const pct      = outcomeYesPct(outcome, rawOpts)
        const yesOdds  = oddsFor(outcome, 'yes', rawOpts, rake)
        const noOdds   = oddsFor(outcome, 'no',  rawOpts, rake)
        const color    = OUTCOME_COLORS[outcome.color_index % OUTCOME_COLORS.length]
        const isSelected = selectedOutcome?.id === outcome.id
        const initials = outcome.name.slice(0, 2).toUpperCase()

        return (
          <div
            key={outcome.id}
            onClick={() => onSelect(outcome, selectedSide)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-mk-divider last:border-0 ${
              isSelected ? 'bg-mk-raised' : 'hover:bg-mk-raised/50'
            }`}
          >
            {/* Avatar */}
            {outcome.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={outcome.image_url}
                alt={outcome.name}
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                style={{ background: `${color}20`, color }}
              >
                {initials}
              </div>
            )}

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mk-text truncate">{outcome.name}</p>
            </div>

            {/* Probability */}
            <div className="tabular text-right shrink-0 w-12">
              <p className="text-2xl font-bold leading-none" style={{ color }}>{pct.toFixed(0)}%</p>
            </div>

            {/* YES button */}
            <button
              onClick={e => { e.stopPropagation(); onSelect(outcome, 'yes'); onMobileSelect(outcome, 'yes') }}
              aria-label={`Bet YES on ${outcome.name}`}
              className="shrink-0 rounded-r-btn border border-mk-yes bg-mk-yes-bg px-3 py-2 text-xs font-bold text-mk-yes hover:bg-mk-yes/20 transition-colors min-h-[44px] min-w-[56px]"
            >
              Yes{yesOdds !== '—' ? ` ${yesOdds}` : ''}
            </button>

            {/* NO button */}
            <button
              onClick={e => { e.stopPropagation(); onSelect(outcome, 'no'); onMobileSelect(outcome, 'no') }}
              aria-label={`Bet NO on ${outcome.name}`}
              className="shrink-0 rounded-r-btn border border-mk-no bg-mk-no-bg px-3 py-2 text-xs font-bold text-mk-no hover:bg-mk-no/20 transition-colors min-h-[44px] min-w-[56px]"
            >
              No{noOdds !== '—' ? ` ${noOdds}` : ''}
            </button>
          </div>
        )
      })}

      {/* Resolved / eliminated outcomes */}
      {resolvedOutcomes.length > 0 && (
        <div className="border-t border-mk-border">
          <button
            onClick={() => setResolvedExpanded(x => !x)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs text-mk-muted hover:text-mk-secondary transition-colors"
          >
            <span>
              {resolvedExpanded ? 'Hide' : `Show ${resolvedOutcomes.length}`} resolved outcomes
            </span>
            <span>{resolvedExpanded ? '↑' : '↓'}</span>
          </button>
          {resolvedExpanded && resolvedOutcomes.map(outcome => {
            const won = outcome.status === 'resolved_yes'
            return (
              <div
                key={outcome.id}
                className="flex items-center gap-3 px-4 py-3 border-t border-mk-divider opacity-60"
              >
                <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold bg-mk-raised text-mk-muted">
                  {outcome.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="flex-1 text-sm text-mk-secondary">{outcome.name}</p>
                <span className={`text-sm font-bold ${won ? 'text-mk-yes' : 'text-mk-no'}`}>
                  {won ? 'Yes ✓' : 'No ⊗'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
