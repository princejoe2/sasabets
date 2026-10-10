import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
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
  const { data: { session } } = await supabase.auth.getSession()
  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata, is_featured')
    .or('metadata->>private.is.null,metadata->>private.neq.true')
    .neq('status', 'pending_approval')
    .order('created_at', { ascending: false })

  const all = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length

  type Mkt = NonNullable<typeof markets>[0]
  function normalise(m: Mkt) {
    return {
      ...m,
      options:     m.options     as Array<{ id: string; label: string; total_pool: number }>,
      metadata:    (m.metadata ?? {}) as Record<string, unknown>,
      is_featured: m.is_featured ?? false,
    }
  }

  const initialCat = (resolvedSearchParams?.cat ?? 'all') as string

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <div className="border-b border-slate-200 bg-white px-4 pt-8 pb-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-slate-900">Prediction </span>
            <span className="text-violet-600">Markets</span>
          </h1>
          <p className="mt-2 text-slate-500">
            {openCount} open now · Pick your outcome · Collect your winnings
          </p>
        </div>
      </div>

      <MarketsClient markets={all.map(normalise)} openCount={openCount} initialCat={initialCat} isLoggedIn={!!session} />
    </div>
  )
}
