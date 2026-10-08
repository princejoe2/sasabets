'use client'
// STUB — replaced in Task 8
import type { MarketData, MarketOutcome } from './types'
export default function OutcomeList(_: {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onSelect: (outcome: MarketOutcome, side: 'yes' | 'no') => void
  onMobileSelect: (outcome: MarketOutcome, side: 'yes' | 'no') => void
}) { return null }
