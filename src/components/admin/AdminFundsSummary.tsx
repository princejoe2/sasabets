'use client'
import { useEffect, useState } from 'react'
import type { MarzStats } from '@/lib/marz'
import MarzStatsWidget from './MarzStatsWidget'

interface Summary {
  totalDeposited: number
  totalWithdrawn: number
  totalBetVol: number
  totalPaidOut: number
  totalRake: number
  totalExitFees: number
  totalUserFunds: number
  marzStats: MarzStats | null
  marzDeposited?: number
  marzWithdrawn?: number
}

const STATS = [
  { key: 'totalDeposited' as const, label: 'Total Deposited',    color: '#34d399' },
  { key: 'totalWithdrawn' as const, label: 'Total Withdrawn',    color: '#fb923c' },
  { key: 'totalBetVol'    as const, label: 'Total Bet Volume',   color: '#60a5fa' },
  { key: 'totalPaidOut'   as const, label: 'Total Paid Out',     color: '#a78bfa' },
  { key: 'totalRake'      as const, label: 'Rake Collected',     color: '#fbbf24' },
  { key: 'totalExitFees'  as const, label: 'Exit Fees',          color: '#f97316' },
  { key: 'totalUserFunds' as const, label: 'User Funds on Hand', color: '#f472b6' },
]

export default function AdminFundsSummary({ initial }: { initial: Summary }) {
  const [data, setData] = useState<Summary>(initial)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    async function refresh() {
      const res = await fetch('/api/admin/funds-summary')
      if (!res.ok) return
      const json: Summary = await res.json()
      setData(json)
      setLastUpdated(new Date())
    }

    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-700">
          Updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 30s
        </span>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STATS.map(s => (
          <div
            key={s.key}
            className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5"
            style={{ borderColor: `${s.color}20` }}
          >
            <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>
              UGX {data[s.key].toLocaleString()}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {data.marzStats && (
        <MarzStatsWidget
          stats={data.marzStats}
          platformDeposited={data.marzDeposited ?? data.totalDeposited}
          platformWithdrawn={data.marzWithdrawn ?? data.totalWithdrawn}
        />
      )}
    </>
  )
}
