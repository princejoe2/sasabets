'use client'
import { useState } from 'react'
import Link from 'next/link'

type Proposal = {
  id: string
  title: string
  description: string | null
  category: string | null
  option_a: string
  option_b: string
  status: string
  market_id: string | null
  vote_count: number | null
  closes_suggestion: string | null
  created_at: string
  user_id: string
}

const THRESHOLD = 10

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-900/20 border-amber-800/40 text-amber-400',
  approved: 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400',
  rejected: 'bg-red-900/20 border-red-800/40 text-red-400',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function AdminProposalsClient({ proposals }: { proposals: Proposal[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const sorted   = [...proposals].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
  const filtered = filter === 'all' ? sorted : sorted.filter(p => p.status === filter)

  const counts = {
    pending:  proposals.filter(p => p.status === 'pending').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Community Proposals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Proposals go live automatically when they reach <span className="text-violet-400 font-bold">{THRESHOLD} community votes</span>. No manual action needed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',  count: counts.pending,  color: 'text-amber-400' },
          { label: 'Live',     count: counts.approved, color: 'text-emerald-400' },
          { label: 'Rejected', count: counts.rejected, color: 'text-slate-500'  },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold capitalize transition-all ${filter === f ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#1e1e2e] text-slate-500 hover:text-white'}`}>
            {f} {f !== 'all' && <span className="opacity-60 text-xs">({counts[f as keyof typeof counts] ?? 0})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-10 text-center text-slate-600">
          No {filter === 'all' ? '' : filter} proposals.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const votes = p.vote_count ?? 0
          const pct   = Math.min((votes / THRESHOLD) * 100, 100)
          return (
            <div key={p.id} className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5 space-y-3">
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a28] text-sm font-black text-slate-500">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.category && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-[#2a2a3e] rounded-full px-2 py-0.5">{p.category}</span>}
                    <span className={`text-[10px] font-bold rounded-full border px-2 py-0.5 capitalize ${STATUS_STYLE[p.status]}`}>{p.status === 'approved' ? '✓ Live' : p.status}</span>
                    <span className="text-[10px] text-slate-700">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="font-bold text-white">{p.title}</p>
                  {p.description && <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-violet-400 font-semibold">{p.option_a}</span>
                    <span className="text-slate-700">vs</span>
                    <span className="text-amber-400 font-semibold">{p.option_b}</span>
                  </div>
                </div>
                {/* Vote count */}
                <div className="shrink-0 text-center">
                  <p className="text-xl font-black text-violet-400">{votes}</p>
                  <p className="text-[10px] text-slate-600">votes</p>
                </div>
              </div>

              {p.status === 'pending' && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
                  </div>
                  <p className="text-[10px] text-slate-700">{votes}/{THRESHOLD} votes to auto-publish</p>
                </div>
              )}

              {p.status === 'approved' && p.market_id && (
                <Link href={`/markets/${p.market_id}`} target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900/20 border border-emerald-800/40 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40 transition-colors">
                  View live market →
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
