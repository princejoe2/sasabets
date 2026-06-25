import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function dayLabel(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: bets },
    { data: recentTxns },
    { data: allTimeTxns },
    { data: markets },
    { data: recentProfiles },
    { count: totalUserCount },
  ] = await Promise.all([
    admin.from('bets').select('id, amount, status, placed_at, user_id').gte('placed_at', thirtyDaysAgo).limit(500),
    admin.from('transactions').select('id, type, amount, status, created_at').gte('created_at', sevenDaysAgo).limit(500),
    admin.from('transactions').select('id, type, amount, status').limit(2000),
    admin.from('markets').select('id, title, total_pool, status, created_at').order('total_pool', { ascending: false }).limit(20),
    admin.from('profiles').select('id, created_at').gte('created_at', thirtyDaysAgo).limit(200),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const transactions = recentTxns

  // Last 7 days daily stats
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const dayBets = (bets ?? []).filter(b => (b.placed_at ?? '').startsWith(dateStr))
    const dayDeposits = (transactions ?? []).filter(t => t.type === 'deposit' && t.status === 'completed' && t.created_at.startsWith(dateStr))
    const dayUsers = (recentProfiles ?? []).filter(p => p.created_at.startsWith(dateStr))
    return {
      label: dayLabel(6 - i),
      betVol: dayBets.reduce((s, b) => s + Number(b.amount), 0),
      betCount: dayBets.length,
      depositVol: dayDeposits.reduce((s, t) => s + Number(t.amount), 0),
      newUsers: dayUsers.length,
    }
  })

  const maxBetVol = Math.max(...days.map(d => d.betVol), 1)
  const maxDeposit = Math.max(...days.map(d => d.depositVol), 1)

  // Top markets by pool
  const topMarkets = [...(markets ?? [])].sort((a, b) => Number(b.total_pool) - Number(a.total_pool)).slice(0, 8)

  // Top bettors
  const betsByUser = (bets ?? []).reduce<Record<string, { count: number; vol: number; won: number }>>((acc, b) => {
    if (!acc[b.user_id]) acc[b.user_id] = { count: 0, vol: 0, won: 0 }
    acc[b.user_id].count++
    acc[b.user_id].vol += Number(b.amount)
    if (b.status === 'won') acc[b.user_id].won++
    return acc
  }, {})
  const topBettors = Object.entries(betsByUser).sort((a, b) => b[1].vol - a[1].vol).slice(0, 6)

  // Summary totals (use allTimeTxns for accurate figures)
  const totalBetVol = (allTimeTxns ?? []).filter(t => t.type === 'bet').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const totalDeposited = (allTimeTxns ?? []).filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0)
  const totalWithdrawn = (allTimeTxns ?? []).filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const totalRake = totalBetVol * 0.08
  const totalUsers = totalUserCount ?? 0

  const SUMMARY = [
    { label: 'Bet Volume (All Time)', value: `UGX ${(totalBetVol/1000).toFixed(1)}K`, color: '#a78bfa' },
    { label: 'Total Deposited',       value: `UGX ${(totalDeposited/1000).toFixed(1)}K`, color: '#34d399' },
    { label: 'Total Withdrawn',       value: `UGX ${(totalWithdrawn/1000).toFixed(1)}K`, color: '#f472b6' },
    { label: 'Platform Rake (est.)',  value: `UGX ${(totalRake/1000).toFixed(1)}K`, color: '#fb923c' },
    { label: 'Total Users',           value: totalUsers,            color: '#60a5fa' },
    { label: 'Total Markets',         value: (markets ?? []).length, color: '#fbbf24' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Analytics</h1>
        <p className="mt-1 text-slate-500">Platform performance and trends</p>
      </div>

      {/* Summary cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {SUMMARY.map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily bet volume chart */}
      <div className="mb-8 rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-6 font-black text-slate-200">Bet Volume — Last 7 Days</h2>
        <div className="flex items-end gap-2 h-40">
          {days.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-mono">
                {d.betVol > 0 ? `${(d.betVol/1000).toFixed(0)}K` : '—'}
              </span>
              <div className="w-full rounded-t-lg bg-violet-600/30" style={{ height: `${(d.betVol / maxBetVol) * 120}px`, minHeight: d.betVol > 0 ? 4 : 1 }} />
              <span className="text-[9px] text-slate-600 text-center">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-600" />
            Bet volume
          </span>
        </div>
      </div>

      {/* Daily deposits chart */}
      <div className="mb-8 rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-6 font-black text-slate-200">Deposits — Last 7 Days</h2>
        <div className="flex items-end gap-2 h-40">
          {days.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-mono">
                {d.depositVol > 0 ? `${(d.depositVol/1000).toFixed(0)}K` : '—'}
              </span>
              <div className="w-full rounded-t-lg bg-emerald-600/40" style={{ height: `${(d.depositVol / maxDeposit) * 120}px`, minHeight: d.depositVol > 0 ? 4 : 1 }} />
              <span className="text-[9px] text-slate-600 text-center">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-6 text-xs text-slate-600">
          {days.map(d => (
            <span key={d.label}>{d.betCount} bets · {d.newUsers} new</span>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top markets */}
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
          <div className="border-b border-[#1a1a28] px-5 py-4">
            <h2 className="font-black text-slate-200">Top Markets by Pool</h2>
          </div>
          {topMarkets.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-600 text-sm">No markets yet</div>
          ) : (
            <div>
              {topMarkets.map((m, i) => {
                const pool = Number(m.total_pool)
                const max = Number(topMarkets[0].total_pool) || 1
                return (
                  <div key={m.id} className="px-5 py-3.5 border-b border-[#1a1a28] last:border-0 hover:bg-[#111120] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                        <p className="text-sm text-slate-300 truncate">{m.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-violet-400">UGX {pool.toLocaleString()}</p>
                        <p className={`text-[10px] ${m.status === 'open' ? 'text-emerald-500' : m.status === 'settled' ? 'text-slate-600' : 'text-amber-500'}`}>{m.status}</p>
                      </div>
                    </div>
                    <div className="ml-6 h-1 rounded-full bg-[#1a1a28]">
                      <div className="h-1 rounded-full bg-violet-600" style={{ width: `${(pool / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top bettors */}
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
          <div className="border-b border-[#1a1a28] px-5 py-4">
            <h2 className="font-black text-slate-200">Top Bettors by Volume</h2>
          </div>
          {topBettors.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-600 text-sm">No bets placed yet</div>
          ) : (
            <div>
              {topBettors.map(([userId, stats], i) => (
                <div key={userId} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#1a1a28] last:border-0 hover:bg-[#111120] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                    <div className="h-7 w-7 rounded-full bg-[#1a1a28] flex items-center justify-center text-xs font-bold text-slate-400">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">User</p>
                      <p className="text-xs font-mono text-slate-600">{userId.slice(0, 8)}…</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">UGX {stats.vol.toLocaleString()}</p>
                    <p className="text-xs text-slate-600">{stats.count} bets · {stats.won} won</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
