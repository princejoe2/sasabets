import MarketsClient from '@/components/MarketsClient'
import { getPublicMarkets } from '@/lib/cached-markets'
import { CATEGORY_PAGES } from '@/lib/market-categories'
import Link from 'next/link'
import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "Uganda Prediction Markets – Football, Politics & Economy",
  description: "Browse live prediction markets on Ugandan football, politics, the economy and entertainment. Crowd-set odds, stakes from UGX 1,000, winnings paid via MTN or Airtel Mobile Money.",
  path: "/markets",
  keywords: [
    "Uganda prediction market",
    "Uganda football predictions",
    "Uganda election predictions",
    "prediction markets Uganda",
    "Mobile Money predictions",
    "community prediction market Uganda"
  ]
})

export const revalidate = 30

export default async function MarketsPage() {
  // Statically rendered + revalidated every 30 s so the CDN can serve it. ?cat= and ?q=
  // are read in the browser by MarketsClient (reading searchParams or cookies here would
  // make the page dynamic and uncacheable), as is the login state.
  const all = await getPublicMarkets()
  const openCount = all.filter(m => m.status === 'open').length

  return (
    <div className="min-h-screen bg-mk-bg page-enter">
      <div className="border-b border-mk-border bg-mk-card px-4 pt-8 pb-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-mk-text">Prediction </span>
            <span className="text-violet-400">Markets</span>
          </h1>
          <p className="mt-2 text-mk-muted">
            {openCount} open now · Pick your outcome · Collect your winnings
          </p>
          <nav aria-label="Market categories" className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_PAGES.map(c => (
              <Link
                key={c.slug}
                href={`/markets/category/${c.slug}`}
                className="rounded-full border border-mk-border bg-mk-raised px-3 py-1 text-xs font-semibold text-mk-secondary transition-colors hover:border-mk-accent/50 hover:text-mk-text"
              >
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <MarketsClient markets={all} openCount={openCount} readUrlFilters />
    </div>
  )
}
