'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MarketData, MarketOutcome } from './types'
import { resolveOptionId, oddsFor, OUTCOME_COLORS } from './types'
import Confetti from '@/components/Confetti'

type PreviewResult = {
  estimated_payout: number
  estimated_profit: number
  estimated_roi_pct: number
  probability_shift_pct: number
  warning: string | null
}

type Props = {
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

function friendlyBetError(data: Record<string, unknown>): string {
  const code = data.code as string | undefined
  const fmt  = (n: unknown) => Number(n).toLocaleString()
  switch (code) {
    case 'market_not_open':      return 'Market is no longer accepting bets.'
    case 'insufficient_balance': return `Wallet has UGX ${fmt(data.balance)} but bet needs UGX ${fmt(data.required)}.`
    case 'account_too_new':      return `New accounts: max UGX ${fmt(data.max_allowed)} per bet for the first 72h.`
    case 'position_limit': {
      const max = Number(data.max_additional_allowed ?? 0)
      return max > 0 ? `Add up to UGX ${fmt(max)} more on this side.` : 'Maximum stake on this side reached.'
    }
    case 'bet_too_large': return `Max single bet: UGX ${fmt(data.max_allowed)}.`
    default: return (data.message as string) || 'Something went wrong. Please try again.'
  }
}

export default function TradePanel({
  market, outcomes, selectedOutcome, selectedSide,
  onSelectOutcome, onSelectSide,
  balance, onBalanceUpdate,
  isLoggedIn, userBet, accessToken,
}: Props) {
  const router  = useRouter()
  const rake    = market.rake_pct ?? 0.08
  const rawOpts = Array.isArray(market.options) ? market.options : []

  const [amount,         setAmount]         = useState('')
  const [balanceMasked,  setBalanceMasked]  = useState(true)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [done,           setDone]           = useState(false)
  const [confirmedAmt,   setConfirmedAmt]   = useState(0)
  const [preview,        setPreview]        = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const amtNum = parseFloat(amount) || 0
  const isOpen = market.status === 'open'

  const fetchPreview = useCallback(async (optId: string, amt: number) => {
    if (!optId || amt < 1000) { setPreview(null); return }
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/market/${market.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: optId, amount: amt }),
      })
      if (res.ok) setPreview(await res.json())
      else setPreview(null)
    } catch { setPreview(null) }
    setPreviewLoading(false)
  }, [market.id])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!selectedOutcome || amtNum < 1000) { setPreview(null); return }
    const optId = resolveOptionId(selectedOutcome, selectedSide)
    timerRef.current = setTimeout(() => fetchPreview(optId, amtNum), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [amount, selectedOutcome, selectedSide, amtNum, fetchPreview])

  async function placeBet() {
    if (!isLoggedIn)      { router.push('/auth'); return }
    if (!selectedOutcome) { setError('Pick an outcome first'); return }
    if (amtNum < 1000)    { setError('Minimum bet is UGX 1,000'); return }
    if (balance !== null && amtNum > balance) { setError('Insufficient balance'); return }

    setLoading(true); setError('')
    const optionId = resolveOptionId(selectedOutcome, selectedSide)
    const res = await fetch('/api/bet/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, optionId, amount: amtNum, accessToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(friendlyBetError(data))
    } else {
      onBalanceUpdate(data.newBalance)
      setConfirmedAmt(amtNum)
      setDone(true)
      setAmount('')
    }
    setLoading(false)
  }

  function setQuickAmount(n: number) {
    const capped = (balance !== null && n > balance) ? Math.floor(balance) : n
    setAmount(String(capped))
    setError('')
  }

  const yesOdds = selectedOutcome ? oddsFor(selectedOutcome, 'yes', rawOpts, rake) : '—'
  const noOdds  = selectedOutcome ? oddsFor(selectedOutcome, 'no',  rawOpts, rake) : '—'
  const color   = selectedOutcome
    ? OUTCOME_COLORS[selectedOutcome.color_index % OUTCOME_COLORS.length]
    : '#22C55E'

  // Success state
  if (done) {
    return (
      <>
      <Confetti />
      <div className="rounded-r-card border border-mk-border bg-mk-card p-6 text-center space-y-4">
        <div className="text-5xl">🎯</div>
        <p className="text-lg font-black text-mk-text">Prediction placed!</p>
        <p className="text-sm text-mk-secondary">
          UGX {confirmedAmt.toLocaleString()} on {selectedOutcome?.name} ({selectedSide.toUpperCase()})
        </p>
        {balance !== null && (
          <p className="text-xs text-mk-muted tabular">
            New balance: <span className="font-semibold text-mk-secondary">UGX {Number(balance).toLocaleString()}</span>
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Link
            href="/bets"
            className="flex-1 rounded-r-btn border border-mk-border py-2.5 text-sm font-semibold text-mk-secondary hover:text-mk-text transition-colors text-center"
          >
            My Bets
          </Link>
          <button
            onClick={() => { setDone(false); onSelectOutcome(null) }}
            className="flex-1 rounded-r-btn bg-mk-accent py-2.5 text-sm font-bold text-center text-black hover:brightness-110 transition-all"
          >
            Bet Again
          </button>
        </div>
      </div>
      </>
    )
  }

  // Closed/settled state
  if (!isOpen) {
    return (
      <div className="rounded-r-card border border-mk-border bg-mk-card p-6 text-center space-y-3">
        <div className="text-4xl">{market.status === 'settled' ? '🏆' : '🔒'}</div>
        <p className="font-bold text-mk-secondary">
          {market.status === 'settled' ? 'Market settled' : 'Market closed'}
        </p>
        <Link
          href="/markets"
          className="block rounded-r-btn border border-mk-border py-2.5 text-sm text-mk-muted hover:text-mk-text transition-colors"
        >
          Browse open markets →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-r-card border border-mk-border bg-mk-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-mk-border px-5 py-4 flex items-center gap-3">
        {selectedOutcome ? (
          <>
            <div
              className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: `${color}20`, color }}
            >
              {selectedOutcome.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-mk-muted">Trading on</p>
              <p className="font-bold text-mk-text text-sm">{selectedOutcome.name}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-mk-muted">Pick an outcome from the list</p>
        )}
        <div className="ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-mk-yes border-b-2 border-mk-yes pb-0.5">
            Buy
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* YES / NO side selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['yes', 'no'] as const).map(side => {
            const isSelected = selectedSide === side
            const odds       = side === 'yes' ? yesOdds : noOdds
            const selClass   = side === 'yes'
              ? 'bg-mk-yes-bg border-2 border-mk-yes text-mk-yes shadow-[0_0_12px_rgba(34,197,94,0.2)]'
              : 'bg-mk-no-bg border-2 border-mk-no text-mk-no shadow-[0_0_12px_rgba(239,68,68,0.2)]'
            return (
              <button
                key={side}
                onClick={() => { onSelectSide(side); setError('') }}
                aria-pressed={isSelected}
                className={`rounded-r-btn py-3 text-sm font-bold transition-all min-h-[44px] ${
                  isSelected ? selClass : 'bg-mk-raised border-2 border-mk-border text-mk-muted'
                }`}
              >
                {side.toUpperCase()} {odds !== '—' ? odds : ''}
              </button>
            )
          })}
        </div>

        {/* Amount input */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-xs font-semibold text-mk-muted uppercase tracking-wider">
              Amount
            </label>
            {balance !== null && (
              <button
                onClick={() => setBalanceMasked(m => !m)}
                className="text-xs text-mk-muted hover:text-mk-secondary tabular"
              >
                Bal: {balanceMasked ? '••••' : `UGX ${Number(balance).toLocaleString()}`}
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-mk-muted select-none">
              UGX
            </span>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
              placeholder="0"
              min="1000"
              className="w-full rounded-r-input border border-mk-border bg-mk-surface pl-14 pr-4 py-3 text-right text-2xl font-bold tabular outline-none focus:border-mk-accent transition-colors text-mk-text"
            />
          </div>
          {/* Quick-add chips */}
          <div className="mt-2 flex gap-1.5">
            {[2000, 5000, 20000].map(v => (
              <button
                key={v}
                onClick={() => setQuickAmount(v)}
                className="flex-1 rounded-r-btn border border-mk-border bg-mk-raised py-1.5 text-xs text-mk-muted hover:text-mk-text hover:border-mk-raised transition-colors"
              >
                +{v >= 1000 ? `${v / 1000}K` : v}
              </button>
            ))}
            <button
              onClick={() => balance !== null && setQuickAmount(Math.floor(balance))}
              disabled={balance === null}
              className="px-2.5 rounded-r-btn border border-mk-border bg-mk-raised text-xs font-bold text-mk-muted hover:text-mk-text hover:border-mk-raised transition-colors disabled:opacity-30"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Live payout preview */}
        {amtNum >= 1000 && selectedOutcome && (
          <div className="rounded-r-input bg-mk-surface px-4 py-3 space-y-1.5 text-sm border border-mk-divider">
            {previewLoading ? (
              <div className="flex items-center gap-2 text-mk-muted text-xs">
                <div className="h-3 w-3 animate-spin rounded-full border border-mk-muted border-t-transparent" />
                <span>Calculating…</span>
              </div>
            ) : preview ? (
              <>
                <div className="flex justify-between text-mk-muted text-xs">
                  <span>Stake</span>
                  <span className="tabular">UGX {amtNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-mk-divider pt-1.5 mt-1">
                  <span className="text-mk-secondary">Potential payout</span>
                  <span className="text-mk-yes tabular">
                    UGX {Number(preview.estimated_payout).toLocaleString()}
                  </span>
                </div>
                {preview.probability_shift_pct > 0.5 && (
                  <p className="text-[10px] text-mk-muted tabular">
                    Moves market {preview.probability_shift_pct.toFixed(1)}%
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* User's existing bet badge */}
        {userBet && !done && (
          <div className="flex items-center gap-2 rounded-r-input bg-mk-yes-bg border border-mk-yes/30 px-3 py-2 text-xs text-mk-yes">
            <span>✓</span>
            <span>You&apos;ve bet UGX {Number(userBet.amount).toLocaleString()} on {userBet.option_id}</span>
          </div>
        )}

        {/* Error slot */}
        {error && (
          <div className="flex items-start gap-2 rounded-r-input border border-orange-800/40 bg-orange-900/15 px-3 py-2.5">
            <span className="text-orange-400 shrink-0 mt-0.5">⚠</span>
            <p className="text-sm text-orange-300 flex-1">{error}</p>
          </div>
        )}

        {/* Trade button */}
        {isLoggedIn ? (
          <button
            onClick={placeBet}
            disabled={loading || !selectedOutcome || amtNum < 1000}
            className={`w-full rounded-r-btn py-3.5 text-sm font-bold transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedOutcome && amtNum >= 1000
                ? 'bg-mk-accent text-black hover:brightness-110'
                : 'bg-mk-raised text-mk-muted'
            }`}
          >
            {loading ? 'Placing…' : !selectedOutcome ? 'Pick an outcome above' : amtNum < 1000 ? 'Enter amount (min 1K)' : 'Trade'}
          </button>
        ) : (
          <Link
            href="/auth"
            className="block w-full rounded-r-btn py-3.5 text-center text-sm font-bold text-black transition-all hover:brightness-110"
            style={{ background: '#22C55E', boxShadow: '0 4px 0 #15803d' }}
          >
            Sign in to trade
          </Link>
        )}

        <p className="text-center text-[10px] text-mk-muted leading-relaxed">
          Fixed return: your payout and odds are locked at the moment of execution.
        </p>
      </div>
    </div>
  )
}
