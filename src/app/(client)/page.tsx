import { createClient } from '@/lib/supabase/server'
import { getPublicMarkets } from '@/lib/cached-markets'
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
  // getSession only reads the cookie (no network call); markets come from the shared 30 s cache
  const authClient = await createClient()
  const [{ data: { session } }, all] = await Promise.all([
    authClient.auth.getSession(),
    getPublicMarkets(),
  ])
  const openCount = all.filter(m => m.status === 'open').length

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--fc-cat-bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketsClient
        markets={all}
        openCount={openCount}
        initialCat="all"
        isLoggedIn={!!session}
      />
    </div>
  )
}
