import { getPublicMarkets } from '@/lib/cached-markets'
import MarketsClient from '@/components/MarketsClient'
import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "Sabula 256 – Uganda's Prediction Market | Win via Mobile Money",
  description: "Uganda's community prediction market. Predict football, politics and the economy — or create your own market. Stake from UGX 1,000 and get paid via MTN or Airtel Mobile Money.",
  path: "/",
  absoluteTitle: true
})

export const revalidate = 30

// The WebSite + Organization nodes are emitted once by the root layout.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://sabula256.com/#webapp',
  name: 'Sabula 256',
  url: 'https://sabula256.com',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'UGX' },
  description: 'Create your own prediction market or join one. Predict Uganda politics, football, economy and more. Win via MTN or Airtel Mobile Money.',
  provider: { '@id': 'https://sabula256.com/#organization' },
  inLanguage: 'en-UG',
  countriesSupported: 'UG',
}

export default async function HomePage() {
  // No cookies/session here on purpose: the page is statically rendered and revalidated
  // every 30 s (ISR), so the HTML is served from the CDN. Login state is detected client-side.
  const all = await getPublicMarkets()
  const openCount = all.filter(m => m.status === 'open').length

  return (
    <div className="min-h-screen page-enter" style={{ background: 'var(--fc-cat-bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">Sabula 256 — Uganda&apos;s community prediction market</h1>
      <MarketsClient
        markets={all}
        openCount={openCount}
        initialCat="all"
      />
    </div>
  )
}
