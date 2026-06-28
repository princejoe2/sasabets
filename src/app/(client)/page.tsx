import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sabula 256 — Uganda\'s Prediction Market',
  description: 'Predict Uganda politics, football, economy and more. Win on MTN or Airtel Mobile Money.',
  openGraph: {
    title: 'Sabula 256 — Uganda\'s Prediction Market',
    description: 'Live prediction markets on Uganda elections, FUFA football, crypto prices and more.',
    url: 'https://sabula256.com',
  },
}

export const revalidate = 30

type Mkt = {
  id: string; title: string; description: string | null
  total_pool: number; options: Array<{ id: string; label: string; total_pool: number }>
  closes_at: string | null; created_at: string; status: string; rake_pct: number
  metadata?: Record<string, unknown>
}

function normalise(m: Mkt) {
  return {
    ...m,
    options:  m.options  as Array<{ id: string; label: string; total_pool: number }>,
    metadata: (m.metadata ?? {}) as Record<string, unknown>,
  }
}

function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Sabula 256',
  url: 'https://sabula256.com',
  description: "Uganda's prediction market — bet on politics, football, economy using Mobile Money",
}

export default async function HomePage() {
  const supabase = createClient()

  const [{ data: markets }, { count: userCount }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const all       = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length
  const totalPool = all.reduce((s, m) => s + Number(m.total_pool), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Compact hero ── */}
      <div className="border-b border-slate-200 px-4 py-6 dark:border-slate-700" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #fff 50%, #f0fdf4 100%)' }}>
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Uganda&apos;s prediction market.
            </h1>
            <p className="mt-1.5 text-base sm:text-lg text-slate-500">
              <span className="font-black text-violet-600">{openCount} markets</span> open now
              {totalPool > 0 && (
                <> · <span className="font-black text-emerald-600">{fmtPool(totalPool)}</span> pooled</>
              )}
              {(userCount ?? 0) > 0 && (
                <> · <span className="font-bold text-slate-700">{userCount}</span> predictors</>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/auth"
              className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-base font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:text-violet-700 text-center"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="btn-glow rounded-xl bg-violet-600 px-5 py-2.5 text-base font-bold text-white transition-colors hover:bg-violet-500 text-center"
            >
              Get started →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Markets immediately ── */}
      <MarketsClient markets={all.map(normalise)} openCount={openCount} initialCat="all" />

    </div>
  )
}
