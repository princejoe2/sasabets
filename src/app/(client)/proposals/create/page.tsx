'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const CATEGORIES = ['Football', 'Politics', 'Economy', 'Entertainment', 'Technology', 'Agriculture', 'Infrastructure', 'Other']

export default function CreateProposalPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState('')
  const [optionA,     setOptionA]     = useState('')
  const [optionB,     setOptionB]     = useState('')
  const [closes,      setCloses]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)
  const [authed,      setAuthed]      = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/auth')
      else setAuthed(true)
    })
  }, [])

  async function submit() {
    if (!title.trim() || !optionA.trim() || !optionB.trim()) {
      setError('Title and both sides are required.'); return
    }
    setSubmitting(true); setError('')
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       title.trim(),
        description: description.trim() || null,
        category:    category || null,
        option_a:    optionA.trim(),
        option_b:    optionB.trim(),
        closes_suggestion: closes || null,
      }),
    })
    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Submission failed.')
    }
    setSubmitting(false)
  }

  if (authed === null) return <div className="flex min-h-screen items-center justify-center"><p className="text-slate-500">Loading…</p></div>

  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="text-6xl">💡</div>
        <h2 className="text-2xl font-black text-white">Proposal submitted!</h2>
        <p className="text-slate-400">Thanks for the idea. Our team will review it and if approved, it becomes a live market. You'll be notified.</p>
        <div className="flex gap-3 pt-2">
          <Link href="/proposals" className="flex-1 rounded-xl border border-[#2a2a3e] py-3 text-sm font-semibold text-slate-300 hover:text-white text-center transition-colors">
            View proposals
          </Link>
          <button onClick={() => { setDone(false); setTitle(''); setDescription(''); setOptionA(''); setOptionB(''); setCloses(''); setCategory('') }}
            className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 transition-colors">
            Submit another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-xl">
          <Link href="/proposals" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to proposals
          </Link>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-500">Community</p>
          <h1 className="text-3xl font-black text-white">Submit a Proposal</h1>
          <p className="mt-2 text-slate-500">Suggest a question the Sabula 256 community should predict on.</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-10 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Question / Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Will Uganda Cranes qualify for AFCON 2027?"
              maxLength={200}
              className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors" />
            <p className="mt-1 text-right text-[10px] text-slate-700">{title.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Context (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add context, a news link, or why this matters…"
              rows={3} maxLength={500}
              className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors resize-none" />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(category === c ? '' : c)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    category === c ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">The two sides *</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-violet-500 tracking-wider">Side A</p>
                <input value={optionA} onChange={e => setOptionA(e.target.value)}
                  placeholder="e.g. Yes"
                  maxLength={80}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-violet-200 outline-none focus:border-violet-600 transition-colors" />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-amber-500 tracking-wider">Side B</p>
                <input value={optionB} onChange={e => setOptionB(e.target.value)}
                  placeholder="e.g. No"
                  maxLength={80}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-amber-200 outline-none focus:border-amber-700 transition-colors" />
              </div>
            </div>
          </div>

          {/* Suggested close */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Suggested closing date (optional)</label>
            <input type="date" value={closes} onChange={e => setCloses(e.target.value)}
              className="rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-slate-400 outline-none focus:border-violet-600 transition-colors" />
            <p className="mt-1 text-xs text-slate-700">When should predictions stop? Admin decides the final date.</p>
          </div>

          <button onClick={submit} disabled={submitting || !title.trim() || !optionA.trim() || !optionB.trim()}
            className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-40 transition-colors">
            {submitting ? 'Submitting…' : 'Submit Proposal'}
          </button>

          <p className="text-center text-[11px] text-slate-700">Proposals are reviewed before going live. Keep it respectful.</p>
        </div>
      </div>
    </div>
  )
}
