'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CreatedMarket {
  id: string
  title: string
  status: string
  total_pool: number
  created_at: string
  metadata: Record<string, unknown> | null
}

interface EarningRow {
  amount: number
  created_at: string
  metadata: Record<string, unknown> | null
}

function fmt(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [markets, setMarkets] = useState<CreatedMarket[]>([])
  const [earnings, setEarnings] = useState<EarningRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'settled'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const [mktsRes, earningsRes] = await Promise.all([
        supabase.from('markets')
          .select('id, title, status, total_pool, created_at, metadata')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('transactions')
          .select('amount, created_at, metadata')
          .eq('user_id', user.id)
          .eq('type', 'creator_share')
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
      ])

      setMarkets((mktsRes.data as CreatedMarket[]) ?? [])
      setEarnings((earningsRes.data as EarningRow[]) ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPool = markets.reduce((s, m) => s + Number(m.total_pool), 0)
  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0)
  const openCount = markets.filter(m => m.status === 'open').length
  const settledCount = markets.filter(m => m.status === 'settled').length

  const filtered = markets.filter(m => filter === 'all' || m.status === filter)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Creator</p>
          <h1 className="text-4xl font-black text-white">My Dashboard</h1>
          <p className="mt-2 text-slate-500">Your markets, earnings, and performance.</p>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-800/35 bg-emerald-900/10 px-4 py-3 max-w-lg">
            <span className="text-lg leading-none mt-0.5">💰</span>
            <div>
              <p className="text-sm font-bold text-emerald-400">You earn 2% of each market's total pool at settlement</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                When any market you created settles with a pool ≥ UGX 50,000, 2% of the whole pool goes straight to your wallet. Attract more bettors — earn more.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Markets', value: markets.length.toString(), color: '#a78bfa' },
            { label: 'Open', value: openCount.toString(), color: '#34d399' },
            { label: 'Pool Attracted', value: fmt(totalPool), color: '#fbbf24' },
            { label: 'Total Earned', value: fmt(totalEarnings), color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings history */}
        {earnings.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Recent Earnings</h2>
              <Link
                href="/wallet"
                className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40 transition-colors"
              >
                Withdraw earnings →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
              {earnings.slice(0, 5).map((e, i) => {
                const meta = (e.metadata ?? {}) as Record<string, unknown>
                return (
                  <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i < Math.min(earnings.length, 5) - 1 ? 'border-b border-[#131320]' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{(meta.market_title as string) ?? 'Market'}</p>
                      <p className="text-xs text-slate-600">{new Date(e.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <p className="font-black text-emerald-400">+{fmt(Number(e.amount))}</p>
                  </div>
                )
              })}
              {earnings.length === 0 && (
                <div className="py-10 text-center space-y-1">
                  <p className="text-2xl">⏳</p>
                  <p className="text-sm font-semibold text-slate-400">No earnings yet</p>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    You receive 2% of the total pool when any market you created settles with at least UGX 50,000 in it. Share your markets to grow the pool and earn more.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Markets list */}
        <div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Your Markets</h2>
            <div className="flex gap-1">
              {(['all', 'open', 'settled'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                    filter === f ? 'bg-violet-600 text-white' : 'border border-[#1e1e2e] text-slate-500 hover:text-white'
                  }`}
                >
                  {f} {f !== 'all' && `(${f === 'open' ? openCount : settledCount})`}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0d0d14] py-16 text-center">
              <p className="text-4xl">🏗️</p>
              <p className="mt-3 font-medium text-slate-400">No markets here yet.</p>
              <Link href="/create" className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Create your first market →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(m => {
                const meta = (m.metadata ?? {}) as Record<string, unknown>
                const isPrivate = meta.private === true
                const statusColor =
                  m.status === 'open' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' :
                  m.status === 'settled' ? 'text-slate-400 bg-[#1e1e2e] border-[#2a2a3e]' :
                  'text-amber-400 bg-amber-900/20 border-amber-800/30'

                return (
                  <div key={m.id} className="overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#0d0d14]">
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {m.status}
                          </span>
                          {isPrivate && (
                            <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                              🔒 Private
                            </span>
                          )}
                          <span className="text-[10px] text-slate-600">{fmt(Number(m.total_pool))} pool</span>
                        </div>
                        <p className="font-bold text-slate-100 leading-snug">{m.title}</p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Created {new Date(m.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Link
                        href={`/markets/${m.id}`}
                        className="shrink-0 rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-violet-600 transition-colors"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create CTA */}
        <div className="text-center">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
          >
            + Create a new market
          </Link>
          <p className="mt-2 text-xs text-slate-600">
            Earn 2% of the pool when your market settles with UGX 50,000+
          </p>
        </div>
      </div>
    </div>
  )
}
