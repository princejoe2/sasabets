'use client'
import { useState } from 'react'
import Link from 'next/link'

type Tab = 'deposits' | 'withdrawals' | 'settled' | 'bets'

interface Deposit {
  id: string; amount: number; status: string; created_at: string
  reference: string | null
  metadata: Record<string, unknown> | null
  profiles: { phone: string; full_name: string | null } | null
}
interface Withdrawal {
  id: string; amount: number; status: string; created_at: string
  metadata: { phone?: string } | null
  profiles: { phone: string; full_name: string | null } | null
}
interface SettledMarket {
  id: string; title: string; total_pool: number; rake_pct: number
  winning_option_id: string | null; settled_at: string | null; created_at: string
  options: Array<{ id: string; label: string; total_pool: number }>
}
interface Bet {
  id: string; amount: number; potential_payout: number; settled_payout: number | null
  status: string; placed_at: string; option_id: string
  profiles: { phone: string } | null
  markets: { title: string; options: Array<{ id: string; label: string }> } | null
}

export interface ActivityProps {
  deposits: Deposit[]
  withdrawals: Withdrawal[]
  settledMarkets: SettledMarket[]
  bets: Bet[]
}

type Props = ActivityProps

function fmt(n: number) { return `UGX ${Number(n).toLocaleString()}` }
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-900/40 text-emerald-400',
  pending:   'bg-amber-900/40 text-amber-400',
  failed:    'bg-red-900/40 text-red-400',
  active:    'bg-sky-900/40 text-sky-400',
  won:       'bg-violet-900/40 text-violet-400',
  lost:      'bg-slate-800 text-slate-500',
  refunded:  'bg-amber-900/40 text-amber-400',
}

export default function AdminActivityClient({ deposits, withdrawals, settledMarkets, bets }: Props) {
  const [tab, setTab] = useState<Tab>('deposits')

  const TABS: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'deposits',    label: 'Deposits',      count: deposits.length,       color: '#34d399' },
    { id: 'withdrawals', label: 'Withdrawals',   count: withdrawals.length,    color: '#fb923c' },
    { id: 'settled',     label: 'Settled Bets',  count: settledMarkets.length, color: '#a78bfa' },
    { id: 'bets',        label: 'Bets Placed',   count: bets.length,           color: '#60a5fa' },
  ]

  // ── Deposit summaries ──
  const depCompleted = deposits.filter(d => d.status === 'completed')
  const depPending   = deposits.filter(d => d.status === 'pending')
  const depFailed    = deposits.filter(d => d.status === 'failed')
  const depTotal     = depCompleted.reduce((s, d) => s + Number(d.amount), 0)

  // ── Withdrawal summaries ──
  const wdPending   = withdrawals.filter(w => w.status === 'pending')
  const wdCompleted = withdrawals.filter(w => w.status === 'completed')
  const wdTotal     = wdCompleted.reduce((s, w) => s + Math.abs(Number(w.amount)), 0)
  const wdPendingAmt = wdPending.reduce((s, w) => s + Math.abs(Number(w.amount)), 0)

  // ── Settled market summaries ──
  const totalPoolSettled = settledMarkets.reduce((s, m) => s + Number(m.total_pool), 0)
  const totalPrizePool   = settledMarkets.reduce((s, m) => s + Number(m.total_pool) * (1 - Number(m.rake_pct)), 0)
  const totalRake        = totalPoolSettled - totalPrizePool

  // ── Bet summaries ──
  const activeBets  = bets.filter(b => b.status === 'active')
  const wonBets     = bets.filter(b => b.status === 'won')
  const lostBets    = bets.filter(b => b.status === 'lost')
  const totalWagered = bets.reduce((s, b) => s + Number(b.amount), 0)

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all"
            style={tab === t.id
              ? { borderColor: `${t.color}50`, background: `${t.color}15`, color: t.color }
              : { borderColor: '#1a1a28', background: 'transparent', color: '#64748b' }
            }
          >
            {t.label}
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
              style={{ background: tab === t.id ? `${t.color}25` : '#1a1a28', color: tab === t.id ? t.color : '#475569' }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── DEPOSITS ── */}
      {tab === 'deposits' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Deposited',   value: fmt(depTotal),       color: '#34d399' },
              { label: 'Completed',         value: depCompleted.length, color: '#34d399' },
              { label: 'Pending',           value: depPending.length,   color: '#fbbf24' },
              { label: 'Failed',            value: depFailed.length,    color: '#f87171' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-4" style={{ borderColor: `${s.color}20` }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span><span className="text-right">Amount</span><span>Status</span><span>Reference</span><span>Date</span>
            </div>
            {deposits.length === 0
              ? <div className="py-12 text-center text-sm text-slate-600">No deposits yet</div>
              : deposits.map((d, i) => (
              <div key={d.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-[#111120] transition-colors ${i < deposits.length - 1 ? 'border-b border-[#1a1a28]' : ''}`}>
                <div>
                  <p className="text-sm font-mono text-slate-200">+{d.profiles?.phone ?? '—'}</p>
                  {d.profiles?.full_name && <p className="text-xs text-slate-600">{d.profiles.full_name}</p>}
                </div>
                <p className="text-sm font-black text-right text-emerald-400">+{fmt(d.amount)}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[d.status] ?? 'bg-slate-800 text-slate-400'}`}>{d.status}</span>
                <span className="text-[10px] font-mono text-slate-600 max-w-[80px] truncate">{d.reference?.slice(0, 8) ?? '—'}</span>
                <span className="text-xs text-slate-600 whitespace-nowrap">{fmtDate(d.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WITHDRAWALS ── */}
      {tab === 'withdrawals' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Withdrawn',   value: fmt(wdTotal),          color: '#fb923c' },
              { label: 'Completed',         value: wdCompleted.length,    color: '#34d399' },
              { label: 'Pending',           value: wdPending.length,      color: '#fbbf24' },
              { label: 'Pending Amount',    value: fmt(wdPendingAmt),     color: '#f87171' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-4" style={{ borderColor: `${s.color}20` }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>

          {wdPending.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-amber-500">{wdPending.length} pending — action required</p>
              <Link href="/admin/withdrawals" className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Process withdrawals →</Link>
            </div>
          )}

          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span><span className="text-right">Amount</span><span>Status</span><span>Send To</span><span>Date</span>
            </div>
            {withdrawals.length === 0
              ? <div className="py-12 text-center text-sm text-slate-600">No withdrawals yet</div>
              : withdrawals.map((w, i) => (
              <div key={w.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-[#111120] transition-colors ${i < withdrawals.length - 1 ? 'border-b border-[#1a1a28]' : ''}`}>
                <div>
                  <p className="text-sm font-mono text-slate-200">+{w.profiles?.phone ?? '—'}</p>
                  {w.profiles?.full_name && <p className="text-xs text-slate-600">{w.profiles.full_name}</p>}
                </div>
                <p className="text-sm font-black text-right text-orange-400">{fmt(Math.abs(w.amount))}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[w.status] ?? 'bg-slate-800 text-slate-400'}`}>{w.status}</span>
                <span className="text-xs font-mono text-slate-500">{w.metadata?.phone ?? '—'}</span>
                <span className="text-xs text-slate-600 whitespace-nowrap">{fmtDate(w.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETTLED BETS (MARKETS) ── */}
      {tab === 'settled' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Markets Settled',  value: settledMarkets.length,        color: '#a78bfa' },
              { label: 'Total Pool',       value: fmt(totalPoolSettled),         color: '#a78bfa' },
              { label: 'Prize Paid Out',   value: fmt(Math.round(totalPrizePool)), color: '#34d399' },
              { label: 'Rake Collected',   value: fmt(Math.round(totalRake)),    color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-4" style={{ borderColor: `${s.color}20` }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>Market</span><span>Winner</span><span className="text-right">Pool</span><span className="text-right">Prize Out</span><span>Settled</span>
            </div>
            {settledMarkets.length === 0
              ? <div className="py-12 text-center text-sm text-slate-600">No markets settled yet</div>
              : settledMarkets.map((m, i) => {
                const winner = m.options?.find((o: { id: string; label: string }) => o.id === m.winning_option_id)
                const prize = Number(m.total_pool) * (1 - Number(m.rake_pct))
                return (
                  <div key={m.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-[#111120] transition-colors ${i < settledMarkets.length - 1 ? 'border-b border-[#1a1a28]' : ''}`}>
                    <p className="text-sm text-slate-200 line-clamp-1">{m.title}</p>
                    <span className="rounded-full bg-violet-900/30 px-2.5 py-1 text-xs font-semibold text-violet-300 max-w-[160px] truncate">{winner?.label ?? '—'}</span>
                    <p className="text-sm font-bold text-right text-slate-300">{fmt(m.total_pool)}</p>
                    <p className="text-sm font-bold text-right text-emerald-400">{fmt(Math.round(prize))}</p>
                    <span className="text-xs text-slate-600 whitespace-nowrap">{fmtDate(m.settled_at)}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* ── BETS PLACED ── */}
      {tab === 'bets' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Wagered', value: fmt(totalWagered),   color: '#60a5fa' },
              { label: 'Active',        value: activeBets.length,   color: '#60a5fa' },
              { label: 'Won',           value: wonBets.length,      color: '#34d399' },
              { label: 'Lost',          value: lostBets.length,     color: '#f87171' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-4" style={{ borderColor: `${s.color}20` }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span><span>Market</span><span>Pick</span><span className="text-right">Stake</span><span className="text-right">Payout</span><span>Status</span>
            </div>
            {bets.length === 0
              ? <div className="py-12 text-center text-sm text-slate-600">No bets placed yet</div>
              : bets.map((b, i) => {
                const market = b.markets as { title: string; options: Array<{ id: string; label: string }> } | null
                const optLabel = market?.options?.find(o => o.id === b.option_id)?.label ?? b.option_id
                const payout = b.settled_payout ?? b.potential_payout
                return (
                  <div key={b.id} className={`grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 hover:bg-[#111120] transition-colors ${i < bets.length - 1 ? 'border-b border-[#1a1a28]' : ''}`}>
                    <span className="text-xs font-mono text-slate-300">+{(b.profiles as { phone: string } | null)?.phone ?? '—'}</span>
                    <span className="text-xs text-slate-400 truncate">{market?.title ?? '—'}</span>
                    <span className="text-xs text-slate-300 truncate">{optLabel}</span>
                    <span className="text-sm font-bold text-right text-slate-200">{fmt(b.amount)}</span>
                    <span className={`text-sm font-bold text-right ${b.status === 'won' ? 'text-emerald-400' : 'text-slate-500'}`}>{fmt(payout ?? 0)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[b.status] ?? 'bg-slate-800 text-slate-400'}`}>{b.status}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}
