'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  content: string
  created_at: string
  author: string
  user_id: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function initials(author: string): string {
  const parts = author.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : author.slice(0, 2).toUpperCase()
}

export default function MarketComments({
  marketId,
  isLoggedIn,
}: {
  marketId: string
  isLoggedIn: boolean
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoggedIn) return
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [isLoggedIn])

  async function loadComments(before?: string) {
    const url = `/api/market/${marketId}/comments${before ? `?before=${encodeURIComponent(before)}` : ''}`
    const r = await fetch(url)
    if (!r.ok) return
    const d = await r.json()
    if (before) {
      setComments(prev => [...prev, ...(d.comments ?? [])])
    } else {
      setComments(d.comments ?? [])
    }
    setHasMore(d.hasMore ?? false)
    setLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [marketId])

  // Real-time new comments via Supabase
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments:${marketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_comments', filter: `market_id=eq.${marketId}` },
        () => {
          loadComments()
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [marketId])

  async function postComment() {
    if (!text.trim()) return
    setPosting(true)
    setError('')
    const r = await fetch(`/api/market/${marketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    const d = await r.json()
    if (!r.ok) {
      setError(d.error ?? 'Failed to post')
    } else {
      setText('')
      setComments(prev => [d.comment, ...prev])
    }
    setPosting(false)
  }

  async function deleteComment(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('market_comments').delete().eq('id', id).eq('user_id', currentUserId!)
    setComments(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  const oldest = comments[comments.length - 1]

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1a1a28] px-4 py-3">
        <span className="text-sm font-bold text-slate-300">Discussion</span>
        <span className="rounded-full bg-[#1e1e2e] px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {comments.length}{hasMore ? '+' : ''}
        </span>
      </div>

      {/* Comment list — newest first */}
      <div className="max-h-[360px] overflow-y-auto">
        {loading && (
          <div className="py-8 text-center text-xs text-slate-700 animate-pulse">Loading…</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-700">
            No comments yet — share your analysis!
          </div>
        )}

        {comments.map((c) => (
          <div
            key={c.id}
            className="group flex gap-3 border-b border-[#141420] px-4 py-3 last:border-0"
          >
            {/* Avatar */}
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e1e2e] text-[10px] font-black text-slate-400">
              {initials(c.author)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300">{c.author}</span>
                <span className="text-[10px] text-slate-600">{timeAgo(c.created_at)}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400 leading-snug break-words whitespace-pre-wrap">
                {c.content}
              </p>
            </div>

            {/* Delete own comment */}
            {currentUserId && c.user_id === currentUserId && (
              <button
                onClick={() => deleteComment(c.id)}
                disabled={deletingId === c.id}
                className="mt-0.5 shrink-0 text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all disabled:opacity-40"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* Load older */}
        {hasMore && oldest && (
          <button
            onClick={() => loadComments(oldest.created_at)}
            className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Load older comments ↓
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {isLoggedIn ? (
        <div className="border-t border-[#1a1a28] p-4 space-y-2">
          {error && (
            <p className="text-xs text-red-400 bg-red-900/15 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  postComment()
                }
              }}
              placeholder="Share your analysis… (Enter to post)"
              maxLength={500}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-[#1e1e2e] bg-[#13131a] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-700 transition-colors"
            />
            <button
              onClick={postComment}
              disabled={posting || !text.trim()}
              className="self-end rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>
          <div className="text-right text-[10px] text-slate-700">{text.length}/500</div>
        </div>
      ) : (
        <div className="border-t border-[#1a1a28] px-4 py-3 text-center text-xs text-slate-600">
          <a href="/auth" className="text-violet-500 hover:text-violet-400 transition-colors">
            Log in
          </a>{' '}
          to join the discussion
        </div>
      )}
    </div>
  )
}
