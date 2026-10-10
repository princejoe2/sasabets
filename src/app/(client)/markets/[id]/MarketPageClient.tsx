'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MarketData, MarketOutcome } from './types'
import MarketHeader from './MarketHeader'
import OutcomeList from './OutcomeList'
import MarketLineChart from './MarketLineChart'
import TradePanel from './TradePanel'
import MobileStickyBar from './MobileStickyBar'
import MobileTradeSheet from './MobileTradeSheet'
import RulesCard from './RulesCard'
import MarketComments from '@/components/MarketComments'

type Props = {
  market: MarketData
  outcomes: MarketOutcome[]
  initialBalance: number | null
  isLoggedIn: boolean
  userBet: { option_id: string; amount: number } | null
  predictorCount: number
  accessToken?: string | null
  creatorInfo?: { name: string; username: string | null; verified: boolean } | null
}

export default function MarketPageClient({
  market: initialMarket,
  outcomes: initialOutcomes,
  initialBalance,
  isLoggedIn,
  userBet,
  accessToken,
  creatorInfo,
  predictorCount,
}: Props) {
  const router = useRouter()

  const [market,   setMarket]   = useState(initialMarket)
  const [outcomes] = useState(initialOutcomes)
  const [balance,  setBalance]  = useState(initialBalance)

  const [selectedOutcome, setSelectedOutcome] = useState<MarketOutcome | null>(null)
  const [selectedSide,    setSelectedSide]    = useState<'yes' | 'no'>('yes')
  const [sheetOpen,       setSheetOpen]       = useState(false)

  const isOpen = market.status === 'open'

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`market-page:${market.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
        payload => {
          const updated = payload.new as Partial<MarketData>
          setMarket(prev => ({ ...prev, ...updated }))
          if (updated.status === 'settled' || updated.status === 'closed') router.refresh()
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [market.id, router])

  function openSheet(outcome: MarketOutcome, side: 'yes' | 'no') {
    setSelectedOutcome(outcome)
    setSelectedSide(side)
    setSheetOpen(true)
  }

  return (
    <div className="market-root">
      {/* pb accounts for sticky bar (h-14) + bottom nav (h-14) + safe area on mobile */}
      <div className="mx-auto max-w-7xl px-4 py-6 pb-[7rem] sm:pb-[4.5rem] lg:pb-6">
        <MarketHeader market={market} creatorInfo={creatorInfo} predictorCount={predictorCount} />

        <div className="mt-6 flex gap-6 items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <MarketLineChart marketId={market.id} outcomes={outcomes} />
            <OutcomeList
              market={market}
              outcomes={outcomes}
              selectedOutcome={selectedOutcome}
              selectedSide={selectedSide}
              onSelect={(o, side) => { setSelectedOutcome(o); setSelectedSide(side) }}
              onMobileSelect={openSheet}
            />
            <RulesCard market={market} />
            <div className="mt-4">
              <MarketComments marketId={market.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Sticky trade panel — desktop only */}
          <div className="hidden lg:block w-80 xl:w-96 shrink-0 sticky top-[88px]">
            <TradePanel
              market={market}
              outcomes={outcomes}
              selectedOutcome={selectedOutcome}
              selectedSide={selectedSide}
              onSelectOutcome={setSelectedOutcome}
              onSelectSide={setSelectedSide}
              balance={balance}
              onBalanceUpdate={setBalance}
              isLoggedIn={isLoggedIn}
              userBet={userBet}
              accessToken={accessToken ?? null}
            />
          </div>
        </div>
      </div>

      {/* Mobile: sticky bar + bottom sheet */}
      {isOpen && (
        <>
          <MobileStickyBar
            market={market}
            outcomes={outcomes}
            selectedOutcome={selectedOutcome}
            selectedSide={selectedSide}
            onOpen={openSheet}
          />
          <MobileTradeSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            market={market}
            outcomes={outcomes}
            selectedOutcome={selectedOutcome}
            selectedSide={selectedSide}
            onSelectOutcome={setSelectedOutcome}
            onSelectSide={setSelectedSide}
            balance={balance}
            onBalanceUpdate={setBalance}
            isLoggedIn={isLoggedIn}
            userBet={userBet}
            accessToken={accessToken ?? null}
          />
        </>
      )}
    </div>
  )
}
