import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prediction Markets – Uganda Politics, Football & More | Sabula 256',
  description: 'Predict Uganda elections, FUFA football, World Cup 2026 and crypto prices on Sabula 256 — Uganda\'s #1 prediction market. Win real money via MTN or Airtel Mobile Money.',
  keywords: ['Uganda prediction market', 'Uganda betting', 'MTN mobile money betting', 'Uganda elections prediction', 'FUFA betting Uganda', 'World Cup 2026 Uganda'],
  alternates: { canonical: 'https://sabula256.com/markets' },
  openGraph: {
    title: 'Prediction Markets | Sabula 256',
    description: 'Predict Uganda elections, FUFA football, World Cup 2026 and crypto prices. Win real money via MTN or Airtel Mobile Money.',
    url: 'https://sabula256.com/markets',
  },
}

export const revalidate = 30

export default async function MarketsPage({
  searchParams,
}: {
  searchParams?: { cat?: string }
}) {
  const supabase = createClient()
  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
    .order('created_at', { ascending: false })

  const all = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length

  type Mkt = NonNullable<typeof markets>[0]
  function normalise(m: Mkt) {
    return {
      ...m,
      options:  m.options  as Array<{ id: string; label: string; total_pool: number }>,
      metadata: (m.metadata ?? {}) as Record<string, unknown>,
    }
  }

  const initialCat = (searchParams?.cat ?? 'all') as string

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <div className="border-b border-slate-200 bg-white px-4 py-8">
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

      <MarketsClient markets={all.map(normalise)} openCount={openCount} initialCat={initialCat} />
    </div>
  )
}
