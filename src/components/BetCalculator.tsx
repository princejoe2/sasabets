'use client'
import { useState, useEffect, useRef } from 'react'

const SAMPLE = {
  title: 'Uganda vs Kenya — Who gets fighter jets first?',
  options: [
    { id: 'a', label: 'Uganda', pool: 420_000 },
    { id: 'b', label: 'Kenya',  pool: 230_000 },
  ],
}

const TOTAL = SAMPLE.options.reduce((s, o) => s + o.pool, 0)
const RAKE  = 0.08

function calcPayout(stake: number, optionPool: number) {
  if (stake <= 0) return 0
  return ((TOTAL + stake) * (1 - RAKE)) / (optionPool + stake) * stake
}

export default function BetCalculator() {
  const [stake,   setStake]   = useState(10_000)
  const [picked,  setPicked]  = useState('a')
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)

  const option     = SAMPLE.options.find(o => o.id === picked)!
  const payout     = calcPayout(stake, option.pool)
  const profit     = payout - stake
  const multiplier = stake > 0 ? payout / stake : 0

  const pctA = Math.round((SAMPLE.options[0].pool / TOTAL) * 100)
  const pctB = 100 - pctA

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const from = display
    const to   = payout
    const t0   = performance.now()
    function tick(now: number) {
      const p = Math.min((now - t0) / 380, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (to - from) * e))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [payout]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl border border-violet-800/30 bg-[#0d0d14] p-6 sm:p-7"
      style={{ boxShadow: '0 0 60px rgba(139,92,246,0.1), 0 0 120px rgba(139,92,246,0.04)' }}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <span className="text-2xl">🧮</span>
        <div>
          <h3 className="font-black text-white">Bet Calculator</h3>
          <p className="text-xs text-slate-500">See your potential winnings before you play</p>
        </div>
      </div>

      {/* Sample market label */}
      <div className="mb-4 rounded-xl border border-[#2a2a3e] bg-[#13131a] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Sample market</p>
        <p className="mt-0.5 text-sm font-bold text-slate-300">{SAMPLE.title}</p>
      </div>

      {/* Binary option picker */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {SAMPLE.options.map((opt, idx) => {
          const isA  = idx === 0
          const sel  = picked === opt.id
          const pct  = isA ? pctA : pctB
          const color      = isA ? '#a78bfa' : '#fbbf24'
          const bg         = sel ? (isA ? 'rgba(167,139,250,0.18)' : 'rgba(251,191,36,0.14)') : '#13131a'
          const borderCol  = sel ? (isA ? 'rgba(167,139,250,0.65)' : 'rgba(251,191,36,0.6)') : '#2a2a3e'

          return (
            <button
              key={opt.id}
              onClick={() => setPicked(opt.id)}
              className="rounded-xl border p-4 text-center transition-all duration-150"
              style={{ background: bg, borderColor: borderCol }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>
                {isA ? 'Side A' : 'Side B'}
              </p>
              <p className="text-sm font-black" style={{ color: sel ? '#f1f5f9' : '#94a3b8' }}>{opt.label}</p>
              <p className="mt-2 text-[10px] text-slate-500">{pct}% of pool</p>
              <div className="mt-2 h-1 w-full rounded-full bg-[#1e1e2e]">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: sel ? color : '#3a3a5e' }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Tug-of-war bar */}
      <div className="mb-5 overflow-hidden rounded-full bg-[#1a1a2e]" style={{ height: 6 }}>
        <div style={{ width: `${pctA}%`, height: '100%', background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
      </div>

      {/* Stake input */}
      <div className="mb-5">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Your stake (UGX)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">UGX</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={stake}
              onChange={e => setStake(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-xl border border-[#2a2a3e] bg-[#13131a] py-3 pl-14 pr-4 text-right font-black text-white transition-colors focus:border-violet-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            {[5_000, 20_000, 50_000].map(v => (
              <button
                key={v}
                onClick={() => setStake(v)}
                className="rounded-lg border border-[#2a2a3e] bg-[#13131a] px-2.5 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:border-violet-600 hover:text-violet-400"
              >
                {v >= 1_000 ? `${v / 1_000}K` : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payout result */}
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Potential payout</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">
              UGX {display.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Profit:{' '}
              <span className="font-bold text-emerald-500">
                +UGX {Math.max(0, Math.round(profit)).toLocaleString()}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-slate-600">Multiplier</p>
            <p
              className="text-3xl font-black tabular-nums"
              style={{ color: multiplier >= 1 ? '#34d399' : '#f472b6' }}
            >
              {multiplier > 0 ? `${multiplier.toFixed(2)}×` : '—'}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-slate-700">
          Indicative only · Actual payout depends on final pool size at close
        </p>
      </div>
    </div>
  )
}
