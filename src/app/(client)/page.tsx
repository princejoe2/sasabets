import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
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

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sabula 256',
    url: 'https://sabula256.com',
    description: "Uganda's community prediction market — predict politics, football, economy and more using MTN or Airtel Mobile Money.",
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

  const [{ data: markets }, { count: userCount }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
      .or('metadata->>private.is.null,metadata->>private.neq.true')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const all       = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length
  const totalPool = all.reduce((s, m) => s + Number(m.total_pool), 0)

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--fc-cat-bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketsClient
        markets={all.map(normalise)}
        openCount={openCount}
        initialCat="all"
        totalPool={totalPool}
        userCount={userCount ?? 0}
      />
    </div>
  )
}
