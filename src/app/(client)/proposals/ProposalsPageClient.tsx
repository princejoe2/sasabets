'use client'
import { useState } from 'react'
import Link from 'next/link'
import ProposalsList, { type Proposal } from './ProposalsList'

const FORM_CATS = [
  { id: 'football',       icon: '⚽', label: 'Football' },
  { id: 'politics',       icon: '🏛️', label: 'Politics' },
  { id: 'economy',        icon: '💰', label: 'Economy' },
  { id: 'entertainment',  icon: '🎵', label: 'Entertainment' },
  { id: 'tech',           icon: '📱', label: 'Technology' },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructure' },
  { id: 'agriculture',    icon: '🌿', label: 'Agriculture' },
  { id: 'other',          icon: '✨', label: 'Other' },
]

type Stats = {
  launched: number
  totalCommunity: number
}

export default function ProposalsPageClient({
  proposals,
  votedIds,
  isLoggedIn,
  stats,
}: {
  proposals: Proposal[]
  votedIds: string[]
  isLoggedIn: boolean
  stats: Stats
}) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState('')
  const [reason,      setReason]      = useState('')
  const [optionA,     setOptionA]     = useState('')
  const [optionB,     setOptionB]     = useState('')
  const [closes,      setCloses]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  function resetForm() {
    setTitle(''); setDescription(''); setCategory(''); setReason('')
    setOptionA(''); setOptionB(''); setCloses(''); setError(''); setDone(false)
  }

  async function submit() {
    if (!title.trim() || !optionA.trim() || !optionB.trim()) {
      setError('Market question and both options are required.')
      return
    }
    setSubmitting(true)
    setError('')

    const combined = [
      description.trim(),
      reason.trim() ? `Why this market: ${reason.trim()}` : '',
    ].filter(Boolean).join('\n\n')

    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:             title.trim(),
        description:       combined || null,
        category:          category || null,
        option_a:          optionA.trim(),
        option_b:          optionB.trim(),
        closes_suggestion: closes || null,
      }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json().catch(() => ({}))
      setError((d as { error?: string }).error ?? 'Submission failed. Please try again.')
    }
    setSubmitting(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Hero ── */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-500">Community</p>
          <h1 className="text-4xl font-black text-white">Suggest a Market</h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Have an idea for a prediction market? Submit it here. Our team reviews proposals daily
            and launches approved markets within 24 hours.
          </p>

          {/* Stats chips */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#2a2a3e] bg-[#111118] px-4 py-2.5">
              <span className="text-xl font-black text-violet-400">{stats.launched}</span>
              <span className="text-xs font-semibold text-slate-500">Markets launched</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#2a2a3e] bg-[#111118] px-4 py-2.5">
              <span className="text-xl font-black text-emerald-400">&lt; 24h</span>
              <span className="text-xs font-semibold text-slate-500">Avg approval time</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#2a2a3e] bg-[#111118] px-4 py-2.5">
              <span className="text-xl font-black text-amber-400">{stats.totalCommunity}</span>
              <span className="text-xs font-semibold text-slate-500">Community proposals</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* ── LEFT: Form (40%) ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6">

              {done ? (
                /* ── Success state ── */
                <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-8 text-center space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-700/40 bg-violet-900/30">
                    <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Proposal submitted!</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Your proposal has been submitted. We'll review it within 24 hours and notify
                      the community once it goes live.
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
                  >
                    Submit another
                  </button>
                  <Link
                    href="/markets"
                    className="block text-center text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    Browse live markets →
                  </Link>
                </div>
              ) : (
                /* ── Proposal form ── */
                <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-black text-white">New proposal</h2>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Suggest a question the Sabula 256 community should predict on.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Market question <span className="text-violet-500">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Will Uganda Cranes qualify for AFCON 2027?"
                      maxLength={120}
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-violet-600 placeholder:text-slate-700"
                    />
                    <p className={`mt-1 text-right text-[10px] transition-colors ${title.length > 100 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {title.length}/120
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FORM_CATS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(category === c.id ? '' : c.id)}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                            category === c.id
                              ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                              : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                          }`}
                        >
                          <span>{c.icon}</span> {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      The two sides <span className="text-violet-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-500">Option A</p>
                        <input
                          value={optionA}
                          onChange={e => setOptionA(e.target.value)}
                          placeholder="e.g. Yes"
                          maxLength={80}
                          className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-3 py-2.5 text-sm text-violet-200 outline-none transition-colors focus:border-violet-600 placeholder:text-slate-700"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">Option B</p>
                        <input
                          value={optionB}
                          onChange={e => setOptionB(e.target.value)}
                          placeholder="e.g. No"
                          maxLength={80}
                          className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-3 py-2.5 text-sm text-amber-200 outline-none transition-colors focus:border-amber-700 placeholder:text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Context <span className="text-slate-700">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Add a news link, background context, or relevant details..."
                      rows={2}
                      maxLength={300}
                      className="w-full resize-none rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-violet-600 placeholder:text-slate-700"
                    />
                    <p className={`mt-1 text-right text-[10px] transition-colors ${description.length > 260 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {description.length}/300
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Why would people bet on this? <span className="text-slate-700">(optional)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="What makes this an interesting prediction market?"
                      rows={2}
                      maxLength={300}
                      className="w-full resize-none rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-violet-600 placeholder:text-slate-700"
                    />
                  </div>

                  {/* Closing date */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Suggested closing date <span className="text-slate-700">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={closes}
                      onChange={e => setCloses(e.target.value)}
                      min={today}
                      className="rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-slate-400 outline-none transition-colors focus:border-violet-600"
                    />
                    <p className="mt-1 text-[10px] text-slate-700">Admin sets the final date.</p>
                  </div>

                  {/* Submit / sign-in */}
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting || !title.trim() || !optionA.trim() || !optionB.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Submit Proposal'
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="flex w-full items-center justify-center rounded-xl border border-violet-800/40 bg-violet-900/20 py-3.5 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-900/40"
                    >
                      Sign in to submit →
                    </Link>
                  )}

                  <p className="text-center text-[11px] text-slate-700">
                    Max 3 proposals per day · Reviewed before going live · Keep it respectful
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Community proposals (60%) ── */}
          <div className="lg:col-span-3">
            <ProposalsList
              proposals={proposals}
              votedIds={votedIds}
              isLoggedIn={isLoggedIn}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
