import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function dayLabel(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })
}

const TX_BG: Record<string, string> = {
  deposit:        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  withdrawal:     'bg-red-500/10 text-red-400 border border-red-500/20',
  bet:            'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  payout:         'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  rake:           'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  cashout:        'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  referral_bonus: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
}

const TX_AMT: Record<string, string> = {
  deposit:        'text-emerald-400',
  withdrawal:     'text-red-400',
  bet:            'text-blue-400',
  payout:         'text-violet-400',
  rake:           'text-amber-400',
  cashout:        'text-orange-400',
  referral_bonus: 'text-teal-400',
}

const STATUS_BG: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  failed:    'bg-red-500/10 text-red-400 border border-red-500/20',
}

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient()

  const sevenDaysAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart    = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  const [
    { data: bets },
    { data: recentTxns },
    { data: allTimeTxns },
    { data: markets },
    { data: recentProfiles },
    { count: totalUserCount },
    { count: totalBetCount },
    { data: allMarkets },
    { data: recentTxnsWithUser },
    { data: dauBets },
  ] = await Promise.all([
    admin.from('bets').select('id, amount, status, placed_at, user_id').gte('placed_at', thirtyDaysAgo).limit(500),
    admin.from('transactions').select('id, type, amount, status, created_at').gte('created_at', sevenDaysAgo).limit(500),
    admin.from('transactions').select('id, type, amount, status').limit(2000),
    admin.from('markets').select('id, title, total_pool, status, created_at').order('total_pool', { ascending: false }).limit(20),
    admin.from('profiles').select('id, created_at').gte('created_at', thirtyDaysAgo).limit(200),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('bets').select('*', { count: 'exact', head: true }),
    admin.from('markets').select('status, total_pool'),
    admin.from('transactions').select('id, type, amount, status, created_at, user_id').order('created_at', { ascending: false }).limit(20),
    admin.from('bets').select('user_id').gte('placed_at', todayStart),
  ])

  const transactions = recentTxns

  // ── Last 7 days daily stats ──────────────────────────────────────────────
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const dayBets     = (bets ?? []).filter(b => (b.placed_at ?? '').startsWith(dateStr))
    const dayDeposits = (transactions ?? []).filter(t => t.type === 'deposit' && t.status === 'completed' && t.created_at.startsWith(dateStr))
    const dayUsers    = (recentProfiles ?? []).filter(p => p.created_at.startsWith(dateStr))
    return {
      label:      dayLabel(6 - i),
      betVol:     dayBets.reduce((s, b) => s + Number(b.amount), 0),
      betCount:   dayBets.length,
      depositVol: dayDeposits.reduce((s, t) => s + Number(t.amount), 0),
      newUsers:   dayUsers.length,
    }
  })

  const maxBetVol  = Math.max(...days.map(d => d.betVol), 1)
  const maxDeposit = Math.max(...days.map(d => d.depositVol), 1)

  // ── Aggregates ───────────────────────────────────────────────────────────
  const topMarkets = [...(markets ?? [])].sort((a, b) => Number(b.total_pool) - Number(a.total_pool)).slice(0, 8)

  const betsByUser = (bets ?? []).reduce<Record<string, { count: number; vol: number; won: number }>>((acc, b) => {
    if (!acc[b.user_id]) acc[b.user_id] = { count: 0, vol: 0, won: 0 }
    acc[b.user_id].count++
    acc[b.user_id].vol += Number(b.amount)
    if (b.status === 'won') acc[b.user_id].won++
    return acc
  }, {})
  const topBettors = Object.entries(betsByUser).sort((a, b) => b[1].vol - a[1].vol).slice(0, 6)

  const totalBetVol    = (allTimeTxns ?? []).filter(t => t.type === 'bet').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const totalDeposited = (allTimeTxns ?? []).filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0)
  const totalWithdrawn = (allTimeTxns ?? []).filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const actualRake     = (allTimeTxns ?? []).filter(t => t.type === 'rake').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const rakeDisplay    = actualRake > 0 ? actualRake : totalBetVol * 0.08
  const totalUsers     = totalUserCount ?? 0

  const totalPool      = (allMarkets ?? []).reduce((s, m) => s + Number(m.total_pool ?? 0), 0)
  const marketsByStatus = (allMarkets ?? []).reduce<Record<string, number>>((acc, m) => {
    const s = m.status as string
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const dauCount = new Set((dauBets ?? []).map(b => b.user_id)).size

  const dauWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const dayBets = (bets ?? []).filter(b => (b.placed_at ?? '').startsWith(dateStr))
    return { label: dayLabel(6 - i), dau: new Set(dayBets.map(b => b.user_id)).size }
  })
  const maxDau = Math.max(...dauWeek.map(d => d.dau), 1)

  const HERO_STATS = [
    { label: 'Total Users',       value: totalUsers.toLocaleString(),               icon: '👥', color: 'text-blue-400',    border: 'border-blue-500/20'   },
    { label: 'Total Bets Placed', value: (totalBetCount ?? 0).toLocaleString(),     icon: '🎯', color: 'text-violet-400',  border: 'border-violet-500/20' },
    { label: 'Total Pool',        value: `UGX ${(totalPool / 1000).toFixed(1)}K`,   icon: '💰', color: 'text-emerald-400', border: 'border-emerald-500/20'},
    { label: 'Rake Earned',       value: `UGX ${(rakeDisplay / 1000).toFixed(1)}K`, icon: '📊', color: 'text-amber-400',   border: 'border-amber-500/20'  },
  ]

  const SUMMARY = [
    { label: 'Bet Volume (All Time)', value: `UGX ${(totalBetVol / 1000).toFixed(1)}K`,    color: '#a78bfa' },
    { label: 'Total Deposited',       value: `UGX ${(totalDeposited / 1000).toFixed(1)}K`, color: '#34d399' },
    { label: 'Total Withdrawn',       value: `UGX ${(totalWithdrawn / 1000).toFixed(1)}K`, color: '#f472b6' },
    { label: 'Platform Rake',         value: `UGX ${(rakeDisplay / 1000).toFixed(1)}K`,    color: '#fb923c' },
    { label: 'Total Users',           value: totalUsers,                                     color: '#60a5fa' },
    { label: 'Total Markets',         value: (allMarkets ?? []).length,                      color: '#fbbf24' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Analytics</h1>
        <p className="mt-1 text-slate-500">Platform performance and trends</p>
      </div>

      {/* ── Hero stat cards ───────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {HERO_STATS.map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} bg-[#0d0d18] p-5`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column main section ───────────────────────────────────────── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-5">

        {/* Recent Transactions table (3/5 width) */}
        <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-[#1a1a28] bg-[#0d0d18]">
          <div className="border-b border-[#1a1a28] px-5 py-4">
            <h2 className="font-black text-slate-200">Recent Transactions</h2>
            <p className="mt-0.5 text-xs text-slate-500">Last 20 across all users</p>
          </div>
          {(recentTxnsWithUser ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-600">No transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a28]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Type</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">User</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentTxnsWithUser ?? []).map(tx => (
                    <tr key={tx.id} className="border-b border-[#111120] transition-colors hover:bg-[#111120]">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-500">
                        {new Date(tx.created_at).toLocaleString('en-UG', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TX_BG[tx.type] ?? 'border border-slate-500/20 bg-slate-500/10 text-slate-400'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${TX_AMT[tx.type] ?? 'text-slate-400'}`}>
                        UGX {Math.abs(Number(tx.amount)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BG[tx.status] ?? 'border border-slate-500/20 bg-slate-500/10 text-slate-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {(tx.user_id as string | null)?.slice(0, 8) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Markets by status */}
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
            <h2 className="mb-4 font-black text-slate-200">Markets by Status</h2>
            <div className="space-y-2.5">
              {([
                { status: 'open',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
                { status: 'closed',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
                { status: 'settled', color: 'text-slate-500',   dot: 'bg-slate-500'   },
              ] as const).map(({ status, color, dot }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-sm capitalize text-slate-400">{status}</span>
                  </div>
                  <span className={`text-sm font-black ${color}`}>
                    {(marketsByStatus[status] ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-[#1a1a28] pt-3">
                <span className="text-xs text-slate-600">Total Markets</span>
                <span className="text-sm font-bold text-slate-300">{(allMarkets ?? []).length.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Daily Active Bettors */}
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
            <h2 className="mb-0.5 font-black text-slate-200">Daily Active Bettors</h2>
            <p className="mb-4 text-xs text-slate-500">Unique users who placed bets</p>
            <div className="space-y-2">
              {dauWeek.map(d => (
                <div key={d.label} className="flex items-center justify-between gap-3">
                  <span className="w-24 shrink-0 text-xs text-slate-500">{d.label}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-[#1a1a28]">
                      <div
                        className="h-1.5 rounded-full bg-violet-600 transition-all"
                        style={{ width: `${d.dau > 0 ? Math.max((d.dau / maxDau) * 100, 4) : 0}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-violet-400">{d.dau}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#1a1a28] pt-3">
              <span className="text-xs text-slate-500">Today (so far)</span>
              <span className="text-sm font-black text-violet-400">{dauCount} active</span>
            </div>
          </div>

          {/* Top 5 markets by pool (compact) */}
          <div className="overflow-hidden rounded-2xl border border-[#1a1a28] bg-[#0d0d18]">
            <div className="border-b border-[#1a1a28] px-5 py-4">
              <h2 className="font-black text-slate-200">Top Markets by Pool</h2>
            </div>
            {topMarkets.slice(0, 5).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-600">No markets yet</div>
            ) : (
              topMarkets.slice(0, 5).map((m, i) => {
                const pool = Number(m.total_pool)
                const maxP = Number(topMarkets[0]?.total_pool) || 1
                return (
                  <div key={m.id} className="border-b border-[#1a1a28] px-5 py-3 transition-colors last:border-0 hover:bg-[#111120]">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 text-xs text-slate-600">{i + 1}</span>
                        <p className="truncate text-xs text-slate-300">{m.title}</p>
                      </div>
                      <p className="shrink-0 text-xs font-bold text-violet-400">UGX {pool.toLocaleString()}</p>
                    </div>
                    <div className="ml-6 h-1 rounded-full bg-[#1a1a28]">
                      <div className="h-1 rounded-full bg-violet-600" style={{ width: `${(pool / maxP) * 100}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {SUMMARY.map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Daily bet volume chart ────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-6 font-black text-slate-200">Bet Volume — Last 7 Days</h2>
        <div className="flex h-40 items-end gap-2">
          {days.map(d => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-slate-500">
                {d.betVol > 0 ? `${(d.betVol / 1000).toFixed(0)}K` : '—'}
              </span>
              <div
                className="w-full rounded-t-lg bg-violet-600/30"
                style={{ height: `${(d.betVol / maxBetVol) * 120}px`, minHeight: d.betVol > 0 ? 4 : 1 }}
              />
              <span className="text-center text-[9px] text-slate-600">{d.label}</span>
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

      {/* ── Daily deposits chart ──────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-6 font-black text-slate-200">Deposits — Last 7 Days</h2>
        <div className="flex h-40 items-end gap-2">
          {days.map(d => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-slate-500">
                {d.depositVol > 0 ? `${(d.depositVol / 1000).toFixed(0)}K` : '—'}
              </span>
              <div
                className="w-full rounded-t-lg bg-emerald-600/40"
                style={{ height: `${(d.depositVol / maxDeposit) * 120}px`, minHeight: d.depositVol > 0 ? 4 : 1 }}
              />
              <span className="text-center text-[9px] text-slate-600">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-6 text-xs text-slate-600">
          {days.map(d => (
            <span key={d.label}>{d.betCount} bets · {d.newUsers} new</span>
          ))}
        </div>
      </div>

      {/* ── Bottom two columns ────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">

        {/* Top markets (full list) */}
        <div className="overflow-hidden rounded-2xl border border-[#1a1a28] bg-[#0d0d18]">
          <div className="border-b border-[#1a1a28] px-5 py-4">
            <h2 className="font-black text-slate-200">Top Markets by Pool</h2>
          </div>
          {topMarkets.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-600">No markets yet</div>
          ) : (
            <div>
              {topMarkets.map((m, i) => {
                const pool = Number(m.total_pool)
                const maxP = Number(topMarkets[0].total_pool) || 1
                return (
                  <div key={m.id} className="border-b border-[#1a1a28] px-5 py-3.5 transition-colors last:border-0 hover:bg-[#111120]">
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="w-4 shrink-0 text-xs text-slate-600">{i + 1}</span>
                        <p className="truncate text-sm text-slate-300">{m.title}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-violet-400">UGX {pool.toLocaleString()}</p>
                        <p className={`text-[10px] ${m.status === 'open' ? 'text-emerald-500' : m.status === 'settled' ? 'text-slate-600' : 'text-amber-500'}`}>
                          {m.status}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6 h-1 rounded-full bg-[#1a1a28]">
                      <div className="h-1 rounded-full bg-violet-600" style={{ width: `${(pool / maxP) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top bettors */}
        <div className="overflow-hidden rounded-2xl border border-[#1a1a28] bg-[#0d0d18]">
          <div className="border-b border-[#1a1a28] px-5 py-4">
            <h2 className="font-black text-slate-200">Top Bettors by Volume</h2>
            <p className="mt-0.5 text-xs text-slate-500">Last 30 days</p>
          </div>
          {topBettors.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-600">No bets placed yet</div>
          ) : (
            <div>
              {topBettors.map(([userId, stats], i) => (
                <div key={userId} className="flex items-center justify-between gap-4 border-b border-[#1a1a28] px-5 py-4 transition-colors last:border-0 hover:bg-[#111120]">
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-xs text-slate-600">{i + 1}</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a28] text-xs font-bold text-slate-400">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">User</p>
                      <p className="font-mono text-xs text-slate-600">{userId.slice(0, 8)}…</p>
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
