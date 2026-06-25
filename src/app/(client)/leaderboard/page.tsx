import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard – Top Predictors | Sabula 256',
  description: 'See the top predictors on Sabula 256. Ranked by net profit and win rate across all prediction markets.',
}

export const dynamic = 'force-dynamic'

function displayName(fullName: string | null, phone: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1][0]}.`
      : parts[0]
  }
  if (phone) return `+${String(phone).slice(-6)}`
  return 'Anonymous'
}

export default async function LeaderboardPage() {
  let bets: Array<{ user_id: string; amount: number; settled_payout: number | null; status: string }> = []
  let profiles: Array<{ id: string; full_name: string | null; phone: string | null; is_admin: boolean }> = []

  try {
    const admin = createAdminClient()
    const [betsRes, profilesRes] = await Promise.all([
      admin.from('bets').select('user_id, amount, settled_payout, status').in('status', ['won', 'lost']),
      admin.from('profiles').select('id, full_name, phone, is_admin'),
    ])
    bets = betsRes.data ?? []
    profiles = profilesRes.data ?? []
  } catch {
    // Admin client unavailable — render empty leaderboard
  }

  const adminIds = new Set((profiles ?? []).filter(p => p.is_admin).map(p => p.id))

  type Row = {
    id: string; name: string
    total: number; wins: number; losses: number
    staked: number; received: number; net: number; winRate: number
  }

  const map: Record<string, Row> = {}

  for (const bet of bets ?? []) {
    if (adminIds.has(bet.user_id)) continue
    if (!map[bet.user_id]) {
      const p = profiles?.find(x => x.id === bet.user_id)
      map[bet.user_id] = {
        id: bet.user_id,
        name: displayName(p?.full_name ?? null, p?.phone ?? null),
        total: 0, wins: 0, losses: 0, staked: 0, received: 0, net: 0, winRate: 0,
      }
    }
    const r = map[bet.user_id]
    r.total++
    r.staked += Number(bet.amount)
    if (bet.status === 'won') { r.wins++; r.received += Number(bet.settled_payout ?? 0) }
    else r.losses++
  }

  const rows = Object.values(map).map(r => ({
    ...r,
    net: r.received - r.staked,
    winRate: r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0,
  }))

  const byProfit  = [...rows].sort((a, b) => b.net - a.net).slice(0, 20)
  const byWinRate = [...rows].filter(r => r.wins + r.losses >= 3).sort((a, b) => b.winRate - a.winRate).slice(0, 20)

  const top3 = byProfit.slice(0, 3)

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

  const podiumMeta = [
    { place: 2, height: 'h-20', bg: 'bg-slate-500/20', border: 'border-slate-500/40', color: 'text-slate-300', label: '2nd' },
    { place: 1, height: 'h-28', bg: 'bg-amber-500/20', border: 'border-amber-500/40', color: 'text-amber-400', label: '1st' },
    { place: 3, height: 'h-14', bg: 'bg-amber-800/20', border: 'border-amber-700/40', color: 'text-amber-700', label: '3rd' },
  ]

  function Table({ data, valueKey, valueLabel }: {
    data: typeof byProfit
    valueKey: 'net' | 'winRate'
    valueLabel: string
  }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 border-b border-[#1e1e2e] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <span>#</span><span>Player</span><span>Bets</span><span>{valueLabel}</span>
        </div>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">No data yet — be the first!</p>
        ) : data.map((r, i) => {
          const isTop = i < 3
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          const rankColor = i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'
          const valueColor = valueKey === 'net'
            ? (r.net >= 0 ? 'text-emerald-400' : 'text-red-400')
            : 'text-violet-400'
          return (
            <div
              key={r.id}
              className={`grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors
                ${i < data.length - 1 ? 'border-b border-[#1a1a28]' : ''}
                ${i === 0 ? 'bg-amber-900/8' : ''}
              `}
            >
              <span className={`text-center text-sm font-black ${rankColor}`}>
                {medal ?? <span className="text-xs">{i + 1}</span>}
              </span>
              <div>
                <p className={`text-sm font-bold ${isTop ? 'text-slate-100' : 'text-slate-300'}`}>{r.name}</p>
                <p className="text-[11px] text-slate-600">{r.wins}W · {r.losses}L</p>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">{r.total}</span>
              <span className={`text-sm font-black tabular-nums ${valueColor}`}>
                {valueKey === 'net'
                  ? `${r.net >= 0 ? '+' : '-'}UGX ${Math.abs(Math.round(r.net)).toLocaleString()}`
                  : `${r.winRate}%`}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-amber-950/25 to-transparent px-4 pb-12 pt-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-500/80">Hall of Fame</p>
          <h1 className="text-4xl font-black text-white">Leaderboard</h1>
          <p className="mt-2 text-slate-500">Top predictors on Sabula 256 · Updates every 5 minutes</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">

        {/* Podium — top 3 only */}
        {top3.length >= 2 && (
          <div className="mb-12">
            <div className="flex items-end justify-center gap-3">
              {podiumOrder.map((player, idx) => {
                const meta = podiumMeta[idx]
                if (!player) return null
                return (
                  <div key={player.id} className="flex flex-col items-center gap-2">
                    <p className={`text-sm font-black ${meta.color}`}>{player.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {player.net >= 0 ? '+' : '-'}UGX {Math.abs(Math.round(player.net)).toLocaleString()}
                    </p>
                    <div className={`flex w-24 ${meta.height} items-center justify-center rounded-t-xl border ${meta.bg} ${meta.border}`}>
                      <span className={`text-2xl font-black ${meta.color}`}>{meta.place}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Two tables */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">🏆 Top by Net Profit</h2>
            <Table data={byProfit} valueKey="net" valueLabel="Net P&L" />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
              🎯 Top by Win Rate{' '}
              <span className="normal-case font-normal text-slate-700">(min. 3 bets)</span>
            </h2>
            <Table data={byWinRate} valueKey="winRate" valueLabel="Win %" />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
          >
            Make your predictions →
          </Link>
        </div>
      </div>
    </div>
  )
}
