import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
import SabulaLogoHero, { SabulaWatermark } from '@/components/SabulaLogo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sabula 256 — Create & Predict. Win Real Money.',
  description: 'Create your own prediction market or join one. Predict Uganda politics, football, economy and more. Win on MTN or Airtel Mobile Money.',
  openGraph: {
    title: 'Sabula 256 — Create & Predict. Win Real Money.',
    description: 'Create your own market or join one. Predict Uganda politics, football, economy and more. Win on MTN or Airtel Mobile Money.',
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

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sabula 256',
    url: 'https://sabula256.com',
    description: "Uganda's community prediction market — create your own prediction markets, bet on politics, football, economy and more using MTN or Airtel Mobile Money.",
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://sabula256.com/markets?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Sabula 256',
    url: 'https://sabula256.com',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'UGX' },
    description: 'Create your own prediction market or join one. Predict Uganda politics, football, economy and more. Win via MTN or Airtel Mobile Money.',
    provider: { '@type': 'Organization', name: 'Sabula 256', url: 'https://sabula256.com' },
    inLanguage: 'en-UG',
    countriesSupported: 'UG',
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: markets }, { count: userCount }, { data: { user } }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
      .or('metadata->>private.is.null,metadata->>private.neq.true')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.auth.getUser(),
  ])

  const all       = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length
  const totalPool = all.reduce((s, m) => s + Number(m.total_pool), 0)

  return (
    <div className="min-h-screen bg-[#f0fdf4] dark:bg-[#040c06] page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <div className={`relative overflow-hidden border-b border-emerald-100/60 dark:border-[rgba(0,255,136,0.1)] ${user ? 'hidden sm:block' : ''}`}
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #f0fdf4 100%)',
        }}
      >
        {/* Dark mode: green radial glow */}
        <div className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,197,24,0.07) 0%, transparent 70%)', zIndex: 0 }}
        />
        <SabulaWatermark />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14 z-10">
          {/* Stats pills */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-[rgba(0,255,136,0.25)] dark:bg-[rgba(0,255,136,0.08)] dark:text-[#00ff88]">
              ⚡ {openCount} markets live
            </span>
            {(userCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-[rgba(0,255,136,0.12)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[rgba(255,255,255,0.5)]">
                {userCount?.toLocaleString()} predictors
              </span>
            )}
            {totalPool > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-[rgba(245,197,24,0.25)] dark:bg-[rgba(245,197,24,0.07)] dark:text-[#f5c518]">
                {fmtPool(totalPool)} pooled
              </span>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16">
            {/* Left: headline */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Ask a question.<br />
                <span className="text-emerald-600 dark:text-[#00ff88]" style={{ textShadow: 'none' }}>
                  Start a market.
                </span><br />
                Win real money.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-500 dark:text-[rgba(255,255,255,0.5)] max-w-lg leading-relaxed">
                Create your own prediction market in seconds — or jump into one of {openCount} live markets. Predict Uganda politics, football, economy and more. Pay out via MTN or Airtel Mobile Money.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/create"
                  className="btn-glow rounded-xl bg-emerald-600 px-6 py-3 text-base font-black text-white transition-colors hover:bg-emerald-500 text-center dark:bg-[#00ff88] dark:text-[#040c06] dark:hover:bg-[#00e07a]"
                >
                  Create a market →
                </Link>
                <Link
                  href="/markets"
                  className="rounded-xl border border-emerald-200 bg-white px-6 py-3 text-base font-semibold text-slate-600 transition-colors hover:border-emerald-400 hover:text-emerald-700 text-center dark:border-[rgba(0,255,136,0.2)] dark:bg-[rgba(0,255,136,0.04)] dark:text-[rgba(255,255,255,0.7)] dark:hover:border-[rgba(0,255,136,0.4)] dark:hover:text-white"
                >
                  Browse markets
                </Link>
              </div>
            </div>

            {/* Right: how-it-works */}
            <div className="w-full lg:w-auto lg:shrink-0 lg:max-w-xs">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm space-y-4 dark:border-[rgba(0,255,136,0.15)] dark:bg-[rgba(255,255,255,0.03)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[rgba(0,255,136,0.5)]">How it works</p>
                {[
                  { n: '01', icon: '✍️', text: 'Write your question & two sides' },
                  { n: '02', icon: '🚀', text: 'Stake UGX 5,000 to launch instantly' },
                  { n: '03', icon: '📲', text: 'Share the link with friends' },
                  { n: '04', icon: '💰', text: 'Winning side splits the full pool' },
                ].map(({ n, icon, text }) => (
                  <div key={n} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm dark:bg-[rgba(0,255,136,0.1)]">{icon}</span>
                    <span className="text-sm text-slate-600 dark:text-[rgba(255,255,255,0.55)] leading-snug">{text}</span>
                  </div>
                ))}
                <Link
                  href="/create"
                  className="mt-1 block w-full rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-black text-white hover:bg-emerald-500 transition-colors dark:bg-[#00ff88] dark:text-[#040c06] dark:hover:bg-[#00e07a]"
                >
                  Create now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Logo hero (shown on mobile for logged-in users) ── */}
      {user && (
        <div className="sm:hidden">
          <SabulaLogoHero />
        </div>
      )}

      {/* ── Markets ── */}
      <MarketsClient markets={all.map(normalise)} openCount={openCount} initialCat="all" />

    </div>
  )
}
