'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export type Proposal = {
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

// ── localStorage helpers ──────────────────────────────────────────
const LS_KEY = 'sabula_voted_proposals'

function getLocalVotes(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveLocalVotes(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

// ── Helpers ───────────────────────────────────────────────────────
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

const THRESHOLD = 10

// ── Category info ─────────────────────────────────────────────────
const CAT_INFO: Record<string, { icon: string; color: string }> = {
  football:       { icon: '⚽', color: 'text-lime-400' },
  politics:       { icon: '🏛️', color: 'text-blue-400' },
  economy:        { icon: '💰', color: 'text-amber-400' },
  entertainment:  { icon: '🎵', color: 'text-pink-400' },
  tech:           { icon: '📱', color: 'text-cyan-400' },
  infrastructure: { icon: '🏗️', color: 'text-orange-400' },
  agriculture:    { icon: '🌿', color: 'text-emerald-400' },
  other:          { icon: '✨', color: 'text-violet-400' },
}

function statusInfo(p: Proposal): { label: string; cls: string } {
  if (p.status === 'approved' && p.market_id) {
    return { label: 'Launched', cls: 'bg-violet-900/30 border-violet-700/40 text-violet-300' }
  }
  if (p.status === 'approved') {
    return { label: 'Approved', cls: 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400' }
  }
  if (p.status === 'rejected') {
    return { label: 'Declined', cls: 'bg-red-900/20 border-red-800/40 text-red-400' }
  }
  return { label: 'Under review', cls: 'bg-amber-900/20 border-amber-800/40 text-amber-400' }
}

// ── Types ─────────────────────────────────────────────────────────
type Sort = 'votes' | 'newest'

// ── Component ─────────────────────────────────────────────────────
export default function ProposalsList({
  proposals,
  votedIds,
  isLoggedIn,
}: {
  proposals: Proposal[]
  votedIds: string[]
  isLoggedIn: boolean
}) {
  const [sort,    setSort]    = useState<Sort>('votes')
  const [votes,   setVotes]   = useState<Record<string, number>>(
    Object.fromEntries(proposals.map(p => [p.id, p.vote_count ?? 0]))
  )
  const [voted,   setVoted]   = useState<Set<string>>(new Set(votedIds))
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Merge server votes + localStorage on mount (client-only)
  useEffect(() => {
    if (isLoggedIn) {
      // Server is source of truth; sync localStorage to match
      const serverSet = new Set(votedIds)
      setVoted(serverSet)
      saveLocalVotes(serverSet)
    } else {
      // No session — use localStorage
      const local = getLocalVotes()
      setVoted(local)
    }
    setMounted(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleVote(id: string) {
    if (loading) return
    const hasVoted = voted.has(id)

    // Optimistic update
    const newVoted = new Set(voted)
    if (hasVoted) { newVoted.delete(id) } else { newVoted.add(id) }
    setVoted(newVoted)
    setVotes(v => ({ ...v, [id]: (v[id] ?? 0) + (hasVoted ? -1 : 1) }))
    saveLocalVotes(newVoted)

    // Persist to server only when logged in
    if (isLoggedIn) {
      setLoading(id)
      try {
        await fetch('/api/proposals/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId: id, remove: hasVoted }),
        })
      } catch {
        // revert on network error
        setVoted(voted)
        setVotes(v => ({ ...v, [id]: (v[id] ?? 0) + (hasVoted ? 1 : -1) }))
        saveLocalVotes(voted)
      }
      setLoading(null)
    }
  }

  const sorted =
    sort === 'votes'
      ? [...proposals].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))
      : [...proposals].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

  return (
    <div className="space-y-4">

      {/* Header + Sort */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Community Proposals</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {(['votes', 'newest'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                sort === s
                  ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                  : 'border-[#1e1e2e] text-slate-500 hover:text-white'
              }`}
            >
              {s === 'votes' ? 'Most voted' : 'Newest'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-12 text-center">
          <p className="mb-3 text-4xl">💡</p>
          <p className="font-bold text-slate-400">No proposals yet</p>
          <p className="mt-1 text-sm text-slate-600">Be the first to suggest a prediction market!</p>
        </div>
      )}

      {/* Proposal cards */}
      {sorted.map(p => {
        const hasVoted  = mounted ? voted.has(p.id) : votedIds.includes(p.id)
        const voteCount = votes[p.id] ?? 0
        const si        = statusInfo(p)
        const catKey    = p.category?.toLowerCase() ?? ''
        const cat       = CAT_INFO[catKey] ?? null

        return (
          <div
            key={p.id}
            className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-4 transition-colors hover:border-[#2a2a3e]"
          >
            <div className="flex items-start gap-3">

              {/* Upvote button */}
              <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                <button
                  onClick={() => toggleVote(p.id)}
                  disabled={loading === p.id || p.status === 'rejected'}
                  title={hasVoted ? 'Remove vote' : 'Upvote this proposal'}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all ${
                    hasVoted
                      ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                      : 'border-[#2a2a3e] text-slate-600 hover:border-violet-800/60 hover:text-violet-400'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {loading === p.id ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : hasVoted ? '♥' : '♡'}
                </button>
                <span className={`text-xs font-black ${hasVoted ? 'text-violet-400' : 'text-slate-600'}`}>
                  {voteCount}
                </span>
              </div>

              {/* Card content */}
              <div className="min-w-0 flex-1">

                {/* Badge row */}
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {cat && p.category && (
                    <span className="flex items-center gap-1 rounded-full border border-[#2a2a3e] bg-[#111118] px-2 py-0.5 text-[10px] font-bold">
                      <span>{cat.icon}</span>
                      <span className={cat.color + ' uppercase tracking-wider'}>{p.category}</span>
                    </span>
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${si.cls}`}>
                    {si.label}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-700">{timeAgo(p.created_at)}</span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold leading-snug text-white">{p.title}</h3>

                {/* Options */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-violet-400">{p.option_a}</span>
                  <span className="text-[11px] text-slate-600">vs</span>
                  <span className="text-[11px] font-semibold text-amber-400">{p.option_b}</span>
                </div>

                {/* Vote progress bar (pending only) */}
                {p.status === 'pending' && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">
                        {voteCount}/{THRESHOLD} votes to launch
                      </span>
                      {voteCount >= THRESHOLD && (
                        <span className="font-bold text-emerald-400">Creating market...</span>
                      )}
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[#1a1a2e]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((voteCount / THRESHOLD) * 100, 100)}%`,
                          background:
                            voteCount >= THRESHOLD
                              ? '#4ade80'
                              : 'linear-gradient(90deg,#6d28d9,#a78bfa)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Launched — link to market */}
                {p.status === 'approved' && p.market_id && (
                  <Link
                    href={`/markets/${p.market_id}`}
                    className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-violet-800/40 bg-violet-900/20 px-3 py-1 text-[11px] font-bold text-violet-300 transition-colors hover:bg-violet-900/40"
                  >
                    Predict now →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Guest nudge */}
      {!isLoggedIn && proposals.length > 0 && (
        <p className="pt-2 text-center text-xs text-slate-600">
          <Link href="/auth" className="text-violet-500 transition-colors hover:text-violet-400">
            Sign in
          </Link>
          {' '}to have your votes count toward launching new markets.
        </p>
      )}
    </div>
  )
}
