import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
import { getPublicMarkets } from '@/lib/cached-markets'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Markets – Uganda Politics, Football & More',
  description: 'Browse live prediction markets on Uganda politics, FUFA football, economy and more — or create your own. Win on MTN or Airtel Mobile Money.',
  keywords: [
    'Uganda prediction market', 'Uganda football prediction', 'Uganda elections betting',
    'MTN mobile money prediction', 'FUFA Uganda betting', 'create prediction market',
    'community prediction market Uganda',
  ],
  alternates: { canonical: 'https://sabula256.com/markets' },
  openGraph: {
    title: 'Browse Markets | Sabula 256',
    description: 'Live prediction markets on Uganda politics, football, economy and more — or create your own. Win via Mobile Money.',
    url: 'https://sabula256.com/markets',
  },
}

export const revalidate = 30

export default async function MarketsPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  // getSession only reads the cookie; markets come from the shared 30 s cache
  const [{ data: { session } }, all] = await Promise.all([
    supabase.auth.getSession(),
    getPublicMarkets(),
  ])
  const openCount = all.filter(m => m.status === 'open').length

  const initialCat = (resolvedSearchParams?.cat ?? 'all') as string

  return (
    <div className="min-h-screen bg-mk-bg page-enter">
      <div className="border-b border-mk-border bg-mk-card px-4 pt-8 pb-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-white">Prediction </span>
            <span className="text-violet-400">Markets</span>
          </h1>
          <p className="mt-2 text-mk-muted">
            {openCount} open now · Pick your outcome · Collect your winnings
          </p>
        </div>
      </div>

      <MarketsClient markets={all}openCount={openCount} initialCat={initialCat} isLoggedIn={!!session} />
    </div>
  )
}
