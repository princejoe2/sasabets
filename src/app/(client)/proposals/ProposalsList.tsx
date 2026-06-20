'use client'
import { useState } from 'react'
import Link from 'next/link'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `${d}d ago`
  if (h > 0)  return `${h}h ago`
  if (m > 0)  return `${m}m ago`
  return 'just now'
}

const THRESHOLD = 10

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
  created_at: string
  user_id: string
}

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
type Filter = typeof FILTERS[number]

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-amber-900/20 border-amber-800/40 text-amber-400' },
  approved: { label: 'Live ✓',  cls: 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400' },
  rejected: { label: 'Declined', cls: 'bg-red-900/20 border-red-800/40 text-red-400' },
}

export default function ProposalsList({
  proposals,
  votedIds,
  isLoggedIn,
}: {
  proposals: Proposal[]
  votedIds: string[]
  isLoggedIn: boolean
}) {
  const [filter,  setFilter]  = useState<Filter>('all')
  const [votes,   setVotes]   = useState<Record<string, number>>(
    Object.fromEntries(proposals.map(p => [p.id, p.vote_count ?? 0]))
  )
  const [voted,   setVoted]   = useState<Set<string>>(new Set(votedIds))
  const [loading, setLoading] = useState<string | null>(null)

  const sorted   = [...proposals].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
  const filtered = filter === 'all' ? sorted : sorted.filter(p => p.status === filter)
  const counts   = Object.fromEntries(
    FILTERS.slice(1).map(f => [f, proposals.filter(p => p.status === f).length])
  )

  async function toggleVote(id: string) {
    if (!isLoggedIn) { window.location.href = '/auth'; return }
    if (loading) return
    setLoading(id)
    const hasVoted = voted.has(id)
    const res = await fetch('/api/proposals/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: id, remove: hasVoted }),
    })
    if (res.ok) {
      setVoted(v => { const s = new Set(v); hasVoted ? s.delete(id) : s.add(id); return s })
      setVotes(v => ({ ...v, [id]: (v[id] ?? 0) + (hasVoted ? -1 : 1) }))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold capitalize transition-all ${
              filter === f ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#1e1e2e] text-slate-500 hover:text-white'
            }`}>
            {f}
            {f !== 'all' && <span className="ml-1.5 text-xs opacity-60">({counts[f] ?? 0})</span>}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-600 self-center">{filtered.length} proposal{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-12 text-center">
          <p className="text-4xl mb-3">💡</p>
          <p className="font-bold text-slate-400">No {filter === 'all' ? '' : filter} proposals yet</p>
          <p className="mt-1 text-sm text-slate-600">Be the first to submit one!</p>
          <Link href="/proposals/create" className="mt-4 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 transition-colors">
            Submit Proposal
          </Link>
        </div>
      )}

      {filtered.map(p => {
        const hasVoted = voted.has(p.id)
        const voteCount = votes[p.id] ?? 0
        const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending
        return (
          <div key={p.id} className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5 transition-colors hover:border-[#2a2a3e]">
            <div className="flex items-start gap-4">
              {/* Vote button */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleVote(p.id)}
                  disabled={loading === p.id || p.status === 'rejected'}
                  className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl border text-xs font-black transition-all ${
                    hasVoted
                      ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                      : 'border-[#2a2a3e] text-slate-500 hover:border-violet-800/60 hover:text-white'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={hasVoted ? 'Remove vote' : 'Upvote this proposal'}
                >
                  <span className="text-base leading-none">{hasVoted ? '▲' : '△'}</span>
                </button>
                <span className={`text-sm font-black ${hasVoted ? 'text-violet-400' : 'text-slate-500'}`}>{voteCount}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {p.category && (
                    <span className="rounded-full border border-[#2a2a3e] bg-[#111118] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {p.category}
                    </span>
                  )}
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${style.cls}`}>
                    {style.label}
                  </span>
                </div>
                <h3 className="font-bold text-white leading-snug">{p.title}</h3>
                {p.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.description}</p>}

                {/* Options */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] px-3 py-1.5 text-xs">
                    <span className="text-violet-400 font-bold">{p.option_a}</span>
                    <span className="text-slate-600">vs</span>
                    <span className="text-amber-400 font-bold">{p.option_b}</span>
                  </span>

                  {p.status === 'approved' && p.market_id && (
                    <Link
                      href={`/markets/${p.market_id}`}
                      className="rounded-lg bg-emerald-900/20 border border-emerald-800/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                    >
                      🎯 Predict now →
                    </Link>
                  )}

                  <span className="ml-auto text-[11px] text-slate-600">{timeAgo(p.created_at)}</span>
                </div>

                {/* Vote progress bar (pending only) */}
                {p.status === 'pending' && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600 font-semibold">
                        {voteCount} / {THRESHOLD} votes needed to go live
                      </span>
                      {voteCount >= THRESHOLD && <span className="text-emerald-400 font-bold">Creating market…</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((voteCount / THRESHOLD) * 100, 100)}%`,
                          background: voteCount >= THRESHOLD ? '#4ade80' : 'linear-gradient(90deg,#6d28d9,#a78bfa)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
