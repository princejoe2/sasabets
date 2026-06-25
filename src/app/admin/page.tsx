import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const admin = createAdminClient()

  const [
    { count: userCount },
    { data: markets },
    { count: activeBetCount },
    { data: transactions },
    { data: wallets },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('markets').select('id, status, total_pool').limit(200),
    admin.from('bets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('transactions').select('id, type, amount, status, created_at').order('created_at', { ascending: false }).limit(50),
    admin.from('wallets').select('balance').limit(1000),
  ])

  const openMarkets   = markets?.filter(m => m.status === 'open').length ?? 0
  const totalPool     = markets?.reduce((s, m) => s + Number(m.total_pool), 0) ?? 0
  const activeBets    = activeBetCount ?? 0
  const totalBetVol   = 0
  const totalBalances = wallets?.reduce((s, w) => s + Number(w.balance), 0) ?? 0

  const deposits  = transactions?.filter(t => t.type === 'deposit'  && t.status === 'completed') ?? []
  const withdraws = transactions?.filter(t => t.type === 'withdrawal' && t.status === 'pending') ?? []
  const totalDeposited = deposits.reduce((s, t) => s + Number(t.amount), 0)

  const rakeCollected = totalBetVol * 0.08

  const recentTxns = transactions?.slice(0, 8) ?? []

  const STATS = [
    { label: 'Total Users',       value: userCount ?? 0,                color: '#60a5fa', prefix: '' },
    { label: 'Open Markets',      value: openMarkets,                   color: '#34d399', prefix: '' },
    { label: 'Active Predictions',value: activeBets,                    color: '#fbbf24', prefix: '' },
    { label: 'Total Pool',        value: `UGX ${(totalPool/1000).toFixed(1)}K`,  color: '#a78bfa', prefix: '' },
    { label: 'User Balances',     value: `UGX ${(totalBalances/1000).toFixed(1)}K`, color: '#f472b6', prefix: '' },
    { label: 'Total Deposited',   value: `UGX ${(totalDeposited/1000).toFixed(1)}K`, color: '#22d3ee', prefix: '' },
    { label: 'Rake Collected',    value: `UGX ${(rakeCollected/1000).toFixed(1)}K`, color: '#fb923c', prefix: '' },
    { label: 'Pending Withdrawals', value: withdraws.length,            color: '#f87171', prefix: '' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="mt-1 text-slate-500">Platform overview · {new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats grid */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5"
            style={{ borderColor: `${s.color}20` }}
          >
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: '/admin/markets',      label: 'Create Market',       color: '#34d399' },
          { href: '/admin/withdrawals',  label: `Process Withdrawals (${withdraws.length})`, color: '#f87171' },
          { href: '/admin/bets',         label: 'View Active Bets',    color: '#fbbf24' },
          { href: '/admin/users',        label: 'Manage Users',        color: '#60a5fa' },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold text-center transition-all hover:-translate-y-0.5"
            style={{ borderColor: `${a.color}40`, color: a.color, background: `${a.color}10` }}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* Recent transactions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-200">Recent Activity</h2>
          <Link href="/admin/transactions" className="text-xs text-slate-500 hover:text-slate-300">View all →</Link>
        </div>
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
          {recentTxns.map((t, i) => (
            <div key={t.id} className={`flex items-center justify-between px-5 py-3.5 ${i < recentTxns.length - 1 ? 'border-b border-[#1a1a28]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  t.type === 'deposit'    ? 'bg-emerald-900/40 text-emerald-400' :
                  t.type === 'withdrawal'? 'bg-orange-900/40 text-orange-400'   :
                  t.type === 'bet'       ? 'bg-blue-900/40 text-blue-400'       :
                  t.type === 'payout'    ? 'bg-violet-900/40 text-violet-400'   :
                  'bg-slate-800 text-slate-400'
                }`}>{t.type}</span>
                <span className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {Number(t.amount) >= 0 ? '+' : ''}UGX {Math.abs(Number(t.amount)).toLocaleString()}
                </span>
                <span className={`ml-3 text-xs ${t.status === 'completed' ? 'text-emerald-600' : t.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
