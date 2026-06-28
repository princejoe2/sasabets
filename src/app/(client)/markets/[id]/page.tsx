import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BetPanel from './BetPanel'
import MarketComments from '@/components/MarketComments'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data: m } = await supabase
    .from('markets')
    .select('title, description, options, total_pool, metadata')
    .eq('id', params.id)
    .single()
  if (!m) return {}
  const opts = m.options as Array<{ label: string; total_pool: number }>
  const desc = m.description
    ?? (opts.length >= 2 ? `${opts[0].label} vs ${opts[1].label} · UGX ${Number(m.total_pool).toLocaleString()} pool` : '')
  const meta = (m.metadata ?? {}) as Record<string, unknown>
  const ogImage = (meta.og_image ?? meta.image ?? null) as string | null
  const canonical = `https://sabula256.com/markets/${params.id}`
  return {
    title: `${m.title} — Sabula 256`,
    description: desc,
    alternates: { canonical },
    openGraph: { title: m.title, description: desc, siteName: 'Sabula 256', type: 'website', ...(ogImage ? { images: [ogImage] } : {}) },
    twitter: ogImage
      ? { card: 'summary_large_image', title: m.title, description: desc, images: [ogImage] }
      : { card: 'summary',             title: m.title, description: desc },
  }
}

type Option = { id: string; label: string; total_pool: number }
type Market = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: Option[]
  closes_at: string | null
  status: string
  rake_pct: number
  winning_option_id: string | null
  metadata: Record<string, unknown> | null
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { pick?: string }
}) {
  const supabase = createClient()

  const { data: market } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, winning_option_id, metadata')
    .eq('id', params.id)
    .single()

  if (!market) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  let balance: number | null = null
  let userBet: { option_id: string; amount: number } | null = null

  // Fetch predictor count (unique user_ids with a non-cancelled bet on this market)
  const { data: bettorRows } = await supabase
    .from('bets')
    .select('user_id')
    .eq('market_id', params.id)
    .neq('status', 'cancelled')
  const predictorCount = new Set((bettorRows ?? []).map((b: { user_id: string }) => b.user_id)).size

  if (user) {
    const [{ data: wallet }, { data: bets }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      supabase.from('bets').select('option_id, amount').eq('user_id', user.id).eq('market_id', params.id).limit(1),
    ])
    balance = wallet?.balance ?? null
    userBet = bets?.[0] ?? null
  }

  const opts = market.options as Option[]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: market.title,
    description: market.description ?? `Prediction market: ${market.title}`,
    url: `https://sabula256.com/markets/${market.id}`,
    organizer: { '@type': 'Organization', name: 'Sabula 256', url: 'https://sabula256.com' },
    ...(market.closes_at ? { endDate: market.closes_at } : {}),
    offers: opts.map(o => ({
      '@type': 'Offer',
      name: o.label,
      price: '0',
      priceCurrency: 'UGX',
      availability: market.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }} />
      <BetPanel
        market={market as Market}
        initialBalance={balance}
        initialPick={searchParams.pick ?? null}
        isLoggedIn={!!user}
        userBet={userBet}
        predictorCount={predictorCount}
      />
      <MarketComments marketId={params.id} isLoggedIn={!!user} />
    </>
  )
}
