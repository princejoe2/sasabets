import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 300

export default async function LeaderboardPage() {
  const admin = createAdminClient()

  const [{ data: bets }, { data: profiles }] = await Promise.all([
    admin.from('bets').select('user_id, amount, settled_payout, status').in('status', ['won', 'lost']),
    admin.from('profiles').select('id, full_name, phone'),
  ])

  type Row = { id: string; name: string; total: number; wins: number; losses: number; staked: number; received: number; net: number; winRate: number }

  const map: Record<string, Row> = {}

  for (const bet of bets ?? []) {
    if (!map[bet.user_id]) {
      const p = profiles?.find(x => x.id === bet.user_id)
      map[bet.user_id] = {
        id: bet.user_id,
        name: p?.full_name ?? (p?.phone ? `+${p.phone.slice(-6)}` : 'Anonymous'),
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

  const medalColor = (i: number) =>
    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'
  const medalIcon  = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`

  function Table({ data, valueKey, valueLabel, valueColor }: {
    data: typeof byProfit
    valueKey: 'net' | 'winRate'
    valueLabel: string
    valueColor: string
  }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-[#1e1e2e] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <span>#</span><span>Player</span><span>Bets</span><span>{valueLabel}</span>
        </div>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">No data yet.</p>
        ) : data.map((r, i) => (
          <div key={r.id} className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 ${i < data.length - 1 ? 'border-b border-[#1a1a28]' : ''} ${i === 0 ? 'bg-amber-900/5' : ''}`}>
            <span className={`w-6 text-center text-sm font-black ${medalColor(i)}`}>{medalIcon(i)}</span>
            <div>
              <p className="text-sm font-bold text-slate-200">{r.name}</p>
              <p className="text-[11px] text-slate-600">{r.wins}W / {r.losses}L</p>
            </div>
            <span className="text-xs text-slate-500">{r.total}</span>
            <span className={`text-sm font-black ${valueColor}`}>
              {valueKey === 'net'
                ? `${r.net >= 0 ? '+' : ''}UGX ${Math.abs(r.net).toLocaleString()}`
                : `${r.winRate}%`}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-amber-950/20 to-transparent px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-500">Hall of Fame</p>
          <h1 className="text-4xl font-black text-white">Leaderboard</h1>
          <p className="mt-2 text-slate-500">Top predictors on Sabula 256 · Updates every 5 minutes</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">🏆 Top by Net Profit</h2>
            <Table data={byProfit} valueKey="net" valueLabel="Net P&L" valueColor={byProfit[0]?.net >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">🎯 Top by Win Rate <span className="text-slate-700 normal-case font-normal">(min. 3 bets)</span></h2>
            <Table data={byWinRate} valueKey="winRate" valueLabel="Win %" valueColor="text-violet-400" />
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/markets" className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 transition-colors">
            Make your predictions →
          </Link>
        </div>
      </div>
    </div>
  )
}
