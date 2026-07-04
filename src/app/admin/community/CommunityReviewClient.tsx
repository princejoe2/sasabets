'use client'

import { useState } from 'react'

export type CommunityMarket = {
  id: string
  title: string
  status: string
  total_pool: number
  created_at: string
  creator_name: string
  bettors: number
}

function fmtUGX(n: number) {
  return `UGX ${Math.round(n).toLocaleString()}`
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function CommunityReviewClient({ initialMarkets }: { initialMarkets: CommunityMarket[] }) {
  const [markets, setMarkets] = useState(initialMarkets)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)

  async function takedown(id: string) {
    setBusyId(id)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/market/${id}/takedown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin_takedown' }),
      })
      const data = await res.json()
      if (res.ok) {
        setMarkets(prev => prev.filter(m => m.id !== id))
        setNotice({
          text: `Market removed. Refunded ${data.refunded_bets} bet${data.refunded_bets === 1 ? '' : 's'} (${fmtUGX(data.refunded_total)}).`,
          ok: true,
        })
      } else {
        setNotice({ text: data.error ?? 'Takedown failed', ok: false })
      }
    } catch {
      setNotice({ text: 'Network error — please retry', ok: false })
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Community Review</h1>
        <p className="mt-1 text-slate-500">
          {markets.length} live community market{markets.length === 1 ? '' : 's'} · remove abusive or broken ones (bettors are refunded)
        </p>
      </div>

      {notice && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.ok
              ? 'border-emerald-800/40 bg-emerald-900/20 text-emerald-300'
              : 'border-red-800/40 bg-red-900/20 text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {markets.length === 0 ? (
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-20 text-center">
          <p className="text-5xl">🌍</p>
          <p className="mt-4 text-lg font-bold text-slate-400">No live community markets</p>
          <p className="mt-2 text-sm text-slate-600">User-created markets will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map(m => {
            const isConfirming = confirmId === m.id
            const isBusy = busyId === m.id
            return (
              <div key={m.id} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-800/40 bg-violet-900/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-300">
                        🌍 {m.creator_name}
                      </span>
                      <span className="rounded-full border border-[#2a2a3e] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {m.status}
                      </span>
                      <span className="text-[11px] text-slate-600">{fmtDate(m.created_at)}</span>
                    </div>
                    <a
                      href={`/markets/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-slate-100 hover:text-violet-300 transition-colors"
                    >
                      {m.title}
                    </a>
                    <p className="mt-1 text-xs text-slate-500">
                      {fmtUGX(m.total_pool)} pool · {m.bettors} bettor{m.bettors === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => takedown(m.id)}
                          disabled={isBusy}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {isBusy ? 'Removing…' : 'Confirm — refund all'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          disabled={isBusy}
                          className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmId(m.id); setNotice(null) }}
                        className="rounded-lg border border-red-800/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:border-red-600 hover:text-red-300 transition-colors"
                      >
                        Remove &amp; refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
