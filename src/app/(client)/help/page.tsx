'use client'
import { useState } from 'react'
import Link from 'next/link'
import { SECTIONS } from './faqs'

function Accordion({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#1e1e2e] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-slate-200 transition-colors hover:text-mk-text"
      >
        <span>{faq.q}</span>
        <span
          className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-[#2a2a3e] text-slate-500 transition-all"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {/* Always in the DOM (hidden when collapsed) so answers are in the server-rendered HTML. */}
      <div hidden={!open} className="px-6 pb-5 text-sm leading-relaxed text-slate-400">
        {faq.a}
      </div>
    </div>
  )
}

export default function HelpPage() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-mk-surface">

      {/* ── Header ── */}
      <div className="border-b border-[#1e1e2e] bg-mk-card px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Help Centre</p>
          <h1 className="mb-3 text-4xl font-black text-mk-text">
            How can we <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">help you?</span>
          </h1>
          <p className="text-slate-500">
            Everything you need to know about deposits, betting, payouts and your account.
          </p>
          <div className="mt-6">
            <Link
              href="/support"
              className="inline-block rounded-xl border border-violet-800/40 bg-violet-900/20 px-5 py-2.5 text-sm font-semibold text-violet-400 transition-colors hover:bg-violet-900/40"
            >
              Can&apos;t find your answer? Contact support →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="sticky top-[61px] z-10 border-b border-[#1e1e2e] bg-mk-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl overflow-x-auto px-4">
          <div className="flex gap-1 py-2 scrollbar-none">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                style={
                  active === s.id
                    ? { color: s.color, background: `${s.color}18` }
                    : { color: '#64748b' }
                }
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ sections ── */}
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.id} id={section.id}>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: `${section.color}15` }}
              >
                {section.icon}
              </div>
              <h2 className="mk-ink text-xl font-black" style={{ color: section.color }}>{section.title}</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-mk-card">
              {section.faqs.map(faq => (
                <Accordion key={faq.q} faq={faq} />
              ))}
            </div>
          </div>
        ))}

        {/* ── Bottom CTA ── */}
        <div className="rounded-2xl border border-[#2a2a3e] bg-mk-card p-8 text-center">
          <p className="mb-2 text-xl font-black text-mk-text">Still stuck?</p>
          <p className="mb-5 text-sm text-slate-500">
            Our support team is available to help with any questions not covered here.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Contact Support →
            </Link>
            <Link
              href="/markets"
              className="rounded-xl border border-[#2a2a3e] bg-mk-card px-6 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:text-mk-text"
            >
              Browse Markets
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
