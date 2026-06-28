'use client'

import { useEffect, useState } from 'react'

type RecentBet = {
  id: string
  amount: number
  placed_at: string
  option_label: string
  predictor: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins} min ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Option index → accent colour (matches BetDistribution)
const OPTION_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b']

interface Props {
  marketId: string
  optionLabels: string[]
}

export default function RecentBets({ marketId, optionLabels }: Props) {
  const [bets, setBets] = useState<RecentBet[]>([])
  const [loading, setLoading] = useState(true)

  // Build a label → colour map using the same colour order as BetDistribution
  const labelColor: Record<string, string> = {}
  optionLabels.forEach((label, i) => {
    labelColor[label] = OPTION_COLORS[Math.min(i, OPTION_COLORS.length - 1)]
  })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/market/${marketId}/recent-bets`)
      .then(r => r.json())
      .then(d => {
        setBets(d.bets ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [marketId])

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Recent Activity
        </span>
        {!loading && bets.length > 0 && (
          <span className="text-[10px] text-slate-700">last {bets.length} bets</span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-8 rounded-lg bg-[#1a1a2e] animate-pulse"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      )}

      {!loading && bets.length === 0 && (
        <p className="py-4 text-center text-xs text-slate-600">
          No bets yet — be the first to predict!
        </p>
      )}

      {!loading && bets.length > 0 && (
        <div className="space-y-1">
          {bets.map((bet, i) => {
            const color = labelColor[bet.option_label] ?? '#64748b'
            const who = bet.predictor ?? 'Someone'
            return (
              <div
                key={bet.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent' }}
              >
                {/* Colour dot for the option */}
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {/* Text */}
                <span className="min-w-0 flex-1 truncate text-slate-500">
                  <span className="text-slate-400">{who}</span>
                  {' bet '}
                  <span className="font-semibold text-slate-300">
                    UGX {bet.amount.toLocaleString()}
                  </span>
                  {' on '}
                  <span className="font-semibold" style={{ color }}>
                    {bet.option_label}
                  </span>
                </span>
                {/* Timestamp */}
                <span className="shrink-0 text-slate-700">{timeAgo(bet.placed_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
