'use client'
import { useState } from 'react'
import type { MarzStats } from '@/lib/marz'

interface Props {
  stats: MarzStats
  platformDeposited: number
  platformWithdrawn: number
}

export default function MarzStatsWidget({ stats, platformDeposited, platformWithdrawn }: Props) {
  const [expanded, setExpanded] = useState(false)

  const reconcileDeposit = stats.totalCollected - platformDeposited
  const reconcileWithdraw = stats.totalDisbursed - platformWithdrawn

  return (
    <div className="mb-8 rounded-2xl border border-blue-900/40 bg-blue-950/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <h2 className="font-black text-blue-300">MarzPay Live</h2>
          <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            Gateway
          </span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-blue-500 hover:text-blue-300 transition-colors"
        >
          {expanded ? 'Hide transactions ↑' : 'Show transactions ↓'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
        <div className="rounded-xl bg-[#0a0a12] border border-blue-900/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">MarzPay Balance</p>
          <p className="mt-1 text-xl font-black text-blue-300 tabular-nums">
            UGX {stats.balance.available.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">available in gateway</p>
        </div>

        <div className="rounded-xl bg-[#0a0a12] border border-emerald-900/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Collected (Gateway)</p>
          <p className="mt-1 text-xl font-black text-emerald-400 tabular-nums">
            UGX {stats.totalCollected.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Platform: UGX {platformDeposited.toLocaleString()}
            {reconcileDeposit !== 0 && (
              <span className={reconcileDeposit > 0 ? ' text-amber-500' : ' text-red-500'}>
                {' '}({reconcileDeposit > 0 ? '+' : ''}{reconcileDeposit.toLocaleString()})
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl bg-[#0a0a12] border border-orange-900/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Disbursed (Gateway)</p>
          <p className="mt-1 text-xl font-black text-orange-400 tabular-nums">
            UGX {stats.totalDisbursed.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Platform: UGX {platformWithdrawn.toLocaleString()}
            {reconcileWithdraw !== 0 && (
              <span className={reconcileWithdraw > 0 ? ' text-amber-500' : ' text-red-500'}>
                {' '}({reconcileWithdraw > 0 ? '+' : ''}{reconcileWithdraw.toLocaleString()})
              </span>
            )}
          </p>
        </div>

        <div className="rounded-xl bg-[#0a0a12] border border-violet-900/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Net Float</p>
          <p className="mt-1 text-xl font-black text-violet-400 tabular-nums">
            UGX {(stats.totalCollected - stats.totalDisbursed).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">collected − disbursed</p>
        </div>
      </div>

      {/* Reconciliation note */}
      {(reconcileDeposit !== 0 || reconcileWithdraw !== 0) && (
        <div className="mx-5 mb-4 rounded-xl border border-amber-800/40 bg-amber-900/10 px-4 py-3 text-xs text-amber-400">
          ⚠️ Reconciliation gap detected — MarzPay totals differ from platform records.
          Check for pending webhooks or transactions processed outside the platform.
        </div>
      )}

      {/* Recent transactions */}
      {expanded && stats.recentTransactions.length > 0 && (
        <div className="border-t border-blue-900/30 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-blue-900/20">
            <span>Type</span><span>Reference</span><span>Amount</span><span>Status</span>
          </div>
          {stats.recentTransactions.slice(0, 20).map((t, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-blue-900/10 hover:bg-blue-950/10 transition-colors">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                t.type === 'collection' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-orange-900/40 text-orange-400'
              }`}>
                {t.type === 'collection' ? 'in' : 'out'}
              </span>
              <span className="text-xs font-mono text-slate-400 truncate">{t.reference || '—'}</span>
              <span className="text-sm font-bold text-slate-200 tabular-nums">
                UGX {t.amount.toLocaleString()}
              </span>
              <span className={`text-[10px] font-bold ${
                t.status === 'successful' ? 'text-emerald-500'
                : t.status === 'failed' || t.status === 'cancelled' ? 'text-red-500'
                : 'text-amber-500'
              }`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {expanded && stats.recentTransactions.length === 0 && (
        <div className="px-5 pb-5 text-sm text-slate-600">No transactions found.</div>
      )}
    </div>
  )
}
