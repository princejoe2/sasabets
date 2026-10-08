'use client'
// STUB — replaced in Task 10
import type { MarketData, MarketOutcome } from './types'
export default function MobileStickyBar(_: {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onOpen: (outcome: MarketOutcome, side: 'yes' | 'no') => void
}) { return null }
