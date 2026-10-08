'use client'
import { useState } from 'react'
import type { MarketData } from './types'

export default function RulesCard({ market }: { market: MarketData }) {
  const [open, setOpen] = useState(false)

  const meta      = market.metadata ?? {}
  const criteria  = typeof meta.resolution_criteria === 'string' ? meta.resolution_criteria : null
  const resolver  = typeof meta.resolver === 'string' ? meta.resolver : 'Sabula 256 Admin'

  if (!criteria) return null

  const createdDate = new Date(market.created_at).toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="rounded-r-card border border-mk-border bg-mk-card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-mk-secondary text-sm">Rules</span>
        <svg
          className={`h-4 w-4 text-mk-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-mk-border px-5 py-4 space-y-4">
          {/* Resolution criteria */}
          <div className="rounded-r-input border border-mk-border bg-mk-surface px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-mk-muted flex items-center gap-1">
                <span>ⓘ</span> Resolution criteria
              </span>
              <span className="text-[10px] text-mk-muted">Updated {createdDate}</span>
            </div>
            <p className="text-sm text-mk-secondary leading-relaxed">{criteria}</p>
          </div>

          <div className="text-xs text-mk-muted">
            Created:{' '}
            {new Date(market.created_at).toLocaleString('en-UG', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Africa/Kampala',
            })}{' '}
            EAT
          </div>

          {/* Resolver */}
          <div className="flex items-center gap-3 rounded-r-input border border-mk-border bg-mk-surface px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-mk-raised flex items-center justify-center text-sm">
              🔮
            </div>
            <div>
              <p className="text-[10px] text-mk-muted uppercase tracking-widest">Resolver</p>
              <p className="text-sm font-semibold text-mk-secondary">{resolver}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
