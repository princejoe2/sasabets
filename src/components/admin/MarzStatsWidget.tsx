'use client'
import { useEffect, useState } from 'react'
import type { MarzStats } from '@/lib/marz'

interface Props {
  stats: MarzStats
  platformDeposited: number
  platformWithdrawn: number
}

export default function MarzStatsWidget({ stats, platformDeposited, platformWithdrawn }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [stuckCount, setStuckCount]   = useState<number | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<{ resolved: number; failed: number; skipped: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/marz-reconcile')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStuckCount(d.count))
      .catch(() => {})
  }, [])

  async function handleReconcile() {
    setReconciling(true)
    setReconcileResult(null)
    try {
      const res = await fetch('/api/admin/marz-reconcile', { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setReconcileResult(d)
        setStuckCount(0)
      }
    } finally {
      setReconciling(false)
    }
  }

  const reconcileDeposit  = stats.totalCollected - platformDeposited
  const reconcileWithdraw = stats.totalDisbursed - platformWithdrawn
  // Only flag when MarzPay shows MORE than platform (missed webhooks).
  // Platform showing more than MarzPay is always expected — full history vs last N transactions.
  const missedWebhook = reconcileDeposit > 0 || reconcileWithdraw > 0

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

      {/* Reconciliation note — only when MarzPay shows more than platform (missed webhooks) */}
      {missedWebhook && (
        <div className="mx-5 mb-4 space-y-3">
          <div className="rounded-xl border border-red-800/40 bg-red-900/10 px-4 py-3 text-xs text-red-400">
            ⚠️ MarzPay collected more than platform records show — possible missed webhooks.
            {reconcileDeposit > 0 && (
              <> Deposits gap: <span className="font-bold">+UGX {reconcileDeposit.toLocaleString()}</span>.</>
            )}
            {reconcileWithdraw > 0 && (
              <> Withdrawals gap: <span className="font-bold">+UGX {reconcileWithdraw.toLocaleString()}</span>.</>
            )}
          </div>

          {/* Stuck deposits */}
          <div className="rounded-xl border border-slate-800 bg-[#0d0d14] px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300">
                Stuck deposits{' '}
                {stuckCount !== null && (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${stuckCount > 0 ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    {stuckCount > 0 ? `${stuckCount} pending > 15 min` : '✓ none'}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Checks MarzPay/Relworx for each pending deposit and credits wallets for any that succeeded.
              </p>
              {reconcileResult && (
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-400">
                  Done — {reconcileResult.resolved} credited · {reconcileResult.failed} failed · {reconcileResult.skipped} skipped
                </p>
              )}
            </div>
            <button
              onClick={handleReconcile}
              disabled={reconciling || stuckCount === 0}
              className="shrink-0 rounded-xl border border-violet-800/40 bg-violet-900/20 px-4 py-2 text-xs font-bold text-violet-400 hover:bg-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {reconciling ? 'Checking…' : 'Reconcile now'}
            </button>
          </div>
        </div>
      )}

      {/* Stuck deposits panel — always visible even when no gap */}
      {!missedWebhook && (
        <div className="mx-5 mb-4">
          <div className="rounded-xl border border-slate-800 bg-[#0d0d14] px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300">
                Stuck deposits{' '}
                {stuckCount !== null && (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${stuckCount > 0 ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    {stuckCount > 0 ? `${stuckCount} pending > 15 min` : '✓ none'}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Checks MarzPay/Relworx for each pending deposit and credits wallets for any that succeeded.
              </p>
              {reconcileResult && (
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-400">
                  Done — {reconcileResult.resolved} credited · {reconcileResult.failed} failed · {reconcileResult.skipped} skipped
                </p>
              )}
            </div>
            <button
              onClick={handleReconcile}
              disabled={reconciling || stuckCount === 0}
              className="shrink-0 rounded-xl border border-violet-800/40 bg-violet-900/20 px-4 py-2 text-xs font-bold text-violet-400 hover:bg-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {reconciling ? 'Checking…' : 'Reconcile now'}
            </button>
          </div>
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
