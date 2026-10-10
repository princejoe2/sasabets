'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SettleMarketForm from '@/components/SettleMarketForm'

export interface QueueMarket {
  id: string
  title: string
  total_pool: number
  closes_at: string | null
  options: Array<{ id: string; label: string; total_pool: number }>
  metadata?: Record<string, unknown>
  description?: string | null
  bettors: number
  nonCreatorBettors: number
  status: string
}

export default function SettleQueueClient({ markets }: { markets: QueueMarket[] }) {
  const router  = useRouter()
  const [settling, setSettling] = useState<QueueMarket | null>(null)

  function selectMarket(m: QueueMarket) {
    setSettling(prev => prev?.id === m.id ? null : m)
    setTimeout(() => document.getElementById('settle-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Settlement Queue</h1>
        <p className="mt-1 text-slate-500">
          {markets.length === 0
            ? 'No markets pending settlement'
            : `${markets.length} market${markets.length !== 1 ? 's' : ''} awaiting settlement`}
        </p>
      </div>

      {/* Inline settle form */}
      {settling && (
        <div id="settle-form" className="mb-6 rounded-2xl border border-amber-800/30 bg-[#0d0d18] p-6">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold text-amber-400">Settle Market</h3>
            <button
              onClick={() => setSettling(null)}
              className="text-slate-600 hover:text-slate-400 text-sm"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-500 line-clamp-1">{settling.title}</p>
          <SettleMarketForm
            market={settling}
            onDone={() => { setSettling(null); router.refresh() }}
          />
        </div>
      )}

      {/* Queue list */}
      <div className="space-y-3">
        {markets.map(m => {
          const isUserCreated    = m.metadata?.user_created === true
          const creatorName      = m.metadata?.creator_name as string | undefined
          const canSettle        = true
          const lowParticipation = isUserCreated && m.nonCreatorBettors < 2
          const isSelected       = settling?.id === m.id
          const closedMs         = m.closes_at ? Date.now() - new Date(m.closes_at).getTime() : null
          const daysAgo          = closedMs !== null ? Math.floor(closedMs / 86_400_000) : null
          const urgency          = daysAgo === null ? '' : daysAgo >= 3 ? 'text-red-400' : daysAgo >= 1 ? 'text-amber-400' : 'text-slate-500'

          return (
            <div
              key={m.id}
              className={`rounded-2xl border p-5 transition-colors ${
                isSelected
                  ? 'border-amber-700/50 bg-amber-950/20'
                  : 'border-[#1a1a28] bg-[#0d0d18] hover:border-[#2a2a3e]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-200">{m.title}</p>
                    {isUserCreated && (
                      <span className="shrink-0 rounded-full border border-violet-700/40 bg-violet-900/20 px-2 py-0.5 text-[9px] font-black text-violet-400">
                        🌍 COMMUNITY
                      </span>
                    )}
                    {m.status === 'open' && (
                      <span className="shrink-0 rounded-full border border-orange-700/40 bg-orange-900/20 px-2 py-0.5 text-[9px] font-black text-orange-400">
                        EXPIRED
                      </span>
                    )}
                  </div>
                  {isUserCreated && creatorName && (
                    <p className="mt-0.5 text-[11px] text-slate-600">by {creatorName}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-300">UGX {m.total_pool.toLocaleString()}</span>
                    <span>{m.bettors} predictor{m.bettors !== 1 ? 's' : ''}</span>
                    {daysAgo !== null && (
                      <span className={urgency}>
                        Closed {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
                      </span>
                    )}
                    {m.closes_at && (
                      <span className="text-slate-600">
                        {new Date(m.closes_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {m.options.map(opt => (
                      <span
                        key={opt.id}
                        className="rounded-full border border-[#1a1a28] bg-[#111120] px-2.5 py-1 text-[11px] font-medium text-slate-400"
                      >
                        {opt.label}
                        <span className="ml-1 text-slate-600">· UGX {Number(opt.total_pool ?? 0).toLocaleString()}</span>
                      </span>
                    ))}
                  </div>

                  {lowParticipation && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Low participation — {m.nonCreatorBettors} non-creator bettor{m.nonCreatorBettors !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="shrink-0 pt-0.5">
                  {canSettle && (
                    <button
                      onClick={() => selectMarket(m)}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                        isSelected
                          ? 'border-amber-700 bg-amber-900/30 text-amber-300'
                          : 'border-amber-800/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'
                      }`}
                    >
                      {isSelected ? '✕ Cancel' : 'Settle'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {markets.length === 0 && (
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-16 text-center">
            <p className="text-3xl">✓</p>
            <p className="mt-3 text-sm font-semibold text-slate-400">All caught up</p>
            <p className="mt-1 text-xs text-slate-600">No closed markets awaiting settlement</p>
          </div>
        )}
      </div>
    </div>
  )
}
