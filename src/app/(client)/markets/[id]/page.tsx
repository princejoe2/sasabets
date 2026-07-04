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
  const pool = Number(m.total_pool)
  const poolStr = pool >= 1_000_000
    ? `UGX ${(pool / 1_000_000).toFixed(1)}M`
    : pool >= 1_000 ? `UGX ${Math.round(pool / 1_000)}K` : `UGX ${pool.toLocaleString()}`
  const baseDesc = m.description
    ?? (opts.length >= 2 ? `${opts[0].label} vs ${opts[1].label}` : m.title)
  const desc = pool > 0
    ? `${baseDesc} · ${poolStr} pool. Predict on Sabula 256 and win via MTN or Airtel Mobile Money.`
    : `${baseDesc} · Predict on Sabula 256 and win via MTN or Airtel Mobile Money.`
  const meta = (m.metadata ?? {}) as Record<string, unknown>
  // Don't leak private market content to crawlers
  if (meta.private === true) {
    return {
      title: 'Private Market | Sabula 256',
      description: 'This market is invite-only. You need the creator\'s secret link to access it.',
    }
  }
  const ogImage = (meta.og_image ?? meta.image ?? null) as string | null
  const canonical = `https://sabula256.com/markets/${params.id}`
  return {
    title: m.title,
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
  settlement_note: string | null
  settlement_evidence_url: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { pick?: string; t?: string }
}) {
  const supabase = createClient()

  const { data: market } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, winning_option_id, settlement_note, settlement_evidence_url, metadata, created_by')
    .eq('id', params.id)
    .single()

  if (!market) notFound()

  // Private market gate — check access token
  const meta = (market.metadata ?? {}) as Record<string, unknown>
  if (meta.private === true) {
    const urlToken     = searchParams.t ?? ''
    const marketToken  = (meta.access_token as string | undefined) ?? ''
    if (!urlToken || urlToken !== marketToken) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-900/20 text-4xl">
            🔒
          </div>
          <h1 className="text-2xl font-black text-white">Private Market</h1>
          <p className="mt-3 max-w-xs text-sm text-slate-400 leading-relaxed">
            This market is invite-only. You need the creator&apos;s secret link to view and join it.
          </p>
          <p className="mt-6 text-xs text-slate-600">Ask the creator to share the full link with you.</p>
        </div>
      )
    }
  }

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

  // Fetch creator profile if market has a creator
  let creatorInfo: { name: string; verified: boolean } | null = null
  if (market.created_by) {
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('full_name, verified_creator')
      .eq('id', market.created_by)
      .single()
    if (creatorProfile?.full_name) {
      const parts = creatorProfile.full_name.trim().split(/\s+/)
      const shortName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
      creatorInfo = { name: shortName, verified: creatorProfile.verified_creator ?? false }
    }
  }

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
        accessToken={searchParams.t ?? null}
        creatorInfo={creatorInfo}
      />
      <MarketComments marketId={params.id} isLoggedIn={!!user} />
    </>
  )
}
