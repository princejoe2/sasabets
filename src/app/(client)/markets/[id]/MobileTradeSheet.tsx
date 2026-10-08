'use client'
import { AnimatePresence, motion } from 'framer-motion'
import TradePanel from './TradePanel'
import type { MarketData, MarketOutcome } from './types'

type Props = {
  open: boolean
  onClose: () => void
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
}

export default function MobileTradeSheet({
  open, onClose,
  market, outcomes,
  selectedOutcome, selectedSide, onSelectOutcome, onSelectSide,
  balance, onBalanceUpdate,
  isLoggedIn, userBet, accessToken,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden overflow-y-auto"
            style={{
              background:    '#111111',
              borderRadius:  '20px 20px 0 0',
              maxHeight:     '90vh',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-mk-border" />
            </div>

            <div className="px-4 pb-4">
              <TradePanel
                market={market}
                outcomes={outcomes}
                selectedOutcome={selectedOutcome}
                selectedSide={selectedSide}
                onSelectOutcome={onSelectOutcome}
                onSelectSide={onSelectSide}
                balance={balance}
                onBalanceUpdate={onBalanceUpdate}
                isLoggedIn={isLoggedIn}
                userBet={userBet}
                accessToken={accessToken}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
