'use client'
// STUB — replaced in Task 9
import type { MarketData, MarketOutcome } from './types'
export default function TradePanel(_: {
  market: MarketData
  outcomes: MarketOutcome[]
  selectedOutcome: MarketOutcome | null
  selectedSide: 'yes' | 'no'
  onSelectOutcome: (o: MarketOutcome | null) => void
  onSelectSide: (s: 'yes' | 'no') => void
  balance: number | null
  onBalanceUpdate: (b: number) => void
  isLoggedIn: boolean
  userBet: { option_id: string; amount: number } | null
  accessToken: string | null
}) { return null }
