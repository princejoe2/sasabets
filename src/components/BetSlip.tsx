'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Option { id: string; label: string; total_pool: number }
interface Market { id: string; title: string; total_pool: number; rake_pct: number; status: string }
interface UserBet { option_id: string; amount: number; status: string }

export default function BetSlip({
  market,
  options,
  user,
  walletBalance,
  userBets,
  defaultOptionId,
}: {
  market: Market
  options: Option[]
  user: User | null
  walletBalance: number
  userBets: UserBet[]
  defaultOptionId?: string
}) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState(defaultOptionId ?? '')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isOpen = market.status === 'open'
  const amtNum = parseFloat(amount) || 0
  const selected = options.find(o => o.id === selectedOption)

  const estimatedPayout = selected && amtNum > 0
    ? (((market.total_pool + amtNum) * (1 - market.rake_pct)) /
        (selected.total_pool + amtNum)) * amtNum
    : 0

  async function placeBet() {
    if (!selectedOption || amtNum <= 0) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/bet/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, optionId: selectedOption, amount: amtNum }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed to place bet')
    else {
      setSuccess('Bet placed!')
      setAmount('')
      setSelectedOption('')
      router.refresh()
    }
    setLoading(false)
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 text-center">
        <p className="mb-4 text-sm text-slate-400">Sign in to place a bet</p>
        <Link
          href="/auth"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Login
        </Link>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
        <p className="text-sm text-slate-400 text-center">Market is closed.</p>
        {userBets.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Your bets</p>
            {userBets.map((b, i) => {
              const opt = options.find(o => o.id === b.option_id)
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span>{opt?.label ?? b.option_id}</span>
                  <span className={b.status === 'won' ? 'text-emerald-400' : 'text-slate-400'}>
                    UGX {Number(b.amount).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 space-y-4">
      <h3 className="font-semibold">Place a Bet</h3>

      <div className="text-xs text-slate-500">
        Balance: <span className="text-violet-400 font-medium">UGX {Number(walletBalance).toLocaleString()}</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">Pick an outcome</p>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelectedOption(opt.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selectedOption === opt.id
                ? 'border-violet-600 bg-violet-900/30 text-white'
                : 'border-[#1e1e2e] hover:border-violet-800 text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs text-slate-500">Amount (UGX)</p>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          min="100"
          className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2 text-sm outline-none focus:border-violet-600 transition-colors"
        />
        <div className="mt-1 flex gap-2">
          {[1000, 5000, 10000].map(v => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="flex-1 rounded border border-[#1e1e2e] py-1 text-xs text-slate-400 hover:border-violet-700 hover:text-white transition-colors"
            >
              {(v / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
      </div>

      {selectedOption && amtNum > 0 && (
        <div className="rounded-lg bg-[#0a0a0f] p-3 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Stake</span>
            <span>UGX {amtNum.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Est. payout</span>
            <span className="text-emerald-400">UGX {Math.round(estimatedPayout).toLocaleString()}</span>
          </div>
          <p className="text-slate-600 pt-1">Payout changes as more bets come in.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      <button
        onClick={placeBet}
        disabled={loading || !selectedOption || amtNum <= 0 || amtNum > walletBalance}
        className="w-full rounded-lg bg-violet-600 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Placing...' : amtNum > walletBalance ? 'Insufficient balance' : 'Place Bet'}
      </button>

      {walletBalance === 0 && (
        <Link href="/wallet" className="block text-center text-xs text-violet-400 hover:text-violet-300">
          Deposit funds →
        </Link>
      )}

      {userBets.length > 0 && (
        <div className="pt-2 space-y-2 border-t border-[#1e1e2e]">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Your bets</p>
          {userBets.map((b, i) => {
            const opt = options.find(o => o.id === b.option_id)
            return (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-400">{opt?.label ?? b.option_id}</span>
                <span className="text-violet-400">UGX {Number(b.amount).toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
