import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/market-token'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MarketPageClient from './MarketPageClient'
import GlobalMarketHeader from '@/components/GlobalMarketHeader'
import FollowButton from '@/components/FollowButton'
import type { MarketOutcome, MarketData } from './types'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  const { data: m } = await admin
    .from('markets')
    .select('title, description, options, total_pool, metadata')
    .eq('id', id)
    .single()
  if (!m) return {}
  const rawOpts = m.options as unknown
  const opts: Array<{ label: string; total_pool: number }> = Array.isArray(rawOpts)
    ? rawOpts
    : (rawOpts as { value?: Array<{ label: string; total_pool: number }> })?.value ?? []
  const pool = Number(m.total_pool)
  const poolStr = pool >= 1_000_000
    ? `UGX ${(pool / 1_000_000).toFixed(1)}M`
    : pool >= 1_000 ? `UGX ${Math.round(pool / 1_000)}K` : `UGX ${pool.toLocaleString()}`
  const baseDesc = m.description ?? (opts.length >= 2 ? `${opts[0].label} vs ${opts[1].label}` : m.title)
  const desc = pool > 0
    ? `${baseDesc} · ${poolStr} pool. Predict on Sabula 256 and win via MTN or Airtel Mobile Money.`
    : `${baseDesc} · Predict on Sabula 256 and win via MTN or Airtel Mobile Money.`
  const meta = (m.metadata ?? {}) as Record<string, unknown>
  if (meta.private === true) {
    return { title: 'Private Market | Sabula 256', description: 'This market is invite-only.' }
  }
  const canonical  = `https://sabula256.com/markets/${id}`
  const ogImageUrl = `/markets/${id}/opengraph-image`
  return {
    title: m.title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: m.title, description: desc, siteName: 'Sabula 256', type: 'website', url: canonical,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: m.title }],
    },
    twitter: { card: 'summary_large_image', title: m.title, description: desc, images: [ogImageUrl] },
  }
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pick?: string; t?: string }>
}) {
  const { id } = await params
  const sp      = await searchParams
  const supabase = await createClient()
  const admin    = createAdminClient()

  const [
    { data: market },
    { data: outcomesRaw },
    { data: { user } },
  ] = await Promise.all([
    admin.from('markets').select(
      'id,title,description,total_pool,options,closes_at,status,rake_pct,winning_option_id,settlement_evidence_url,metadata,created_by,created_at'
    ).eq('id', id).single(),
    admin.from('market_outcomes').select('*').eq('market_id', id).order('sort_order'),
    supabase.auth.getUser(),
  ])

  if (!market) notFound()

  // Private market gate
  const meta = (market.metadata ?? {}) as Record<string, unknown>
  if (meta.private === true) {
    const urlToken = sp.t ?? ''
    if (!verifyAccessToken(meta, urlToken)) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-900/20 text-4xl">🔒</div>
          <h1 className="text-2xl font-black text-white">Private Market</h1>
          <p className="mt-3 max-w-xs text-sm text-mk-muted leading-relaxed">
            This market is invite-only. You need the creator&apos;s secret link.
          </p>
        </div>
      )
    }
  }

  if (market.status === 'pending_approval' && (!user || market.created_by !== user.id)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-900/20 text-4xl">🕐</div>
        <h1 className="text-2xl font-black text-white">Market Under Review</h1>
        <p className="mt-3 text-sm text-mk-muted">Awaiting admin approval.</p>
      </div>
    )
  }

  // Build outcomes — fall back to synthetic if market_outcomes table empty for this market
  const rawOpts = Array.isArray(market.options)
    ? market.options as Array<{ id: string; label: string; total_pool: number }>
    : []

  let outcomes: MarketOutcome[] = (outcomesRaw ?? []) as MarketOutcome[]
  if (outcomes.length === 0) {
    outcomes = rawOpts
      .filter(o => !o.id.endsWith('_no'))
      .map((o, i) => ({
        id:                 `synthetic-${o.id}`,
        market_id:          id,
        slug:               o.id.replace(/_yes$/, ''),
        name:               o.label.replace(/\s+(YES|Yes)$/, '').trim(),
        image_url:          null,
        image_source:       null,
        image_credit:       null,
        image_override:     false,
        image_needs_review: false,
        sort_order:         i,
        status:             'active' as const,
        color_index:        i % 8,
        probability:        null,
      }))
  }

  let balance: number | null        = null
  let userBet: { option_id: string; amount: number } | null = null
  let isFollowing                   = false
  let creatorInfo: { name: string; username: string | null; verified: boolean } | null = null

  if (user) {
    const [{ data: wallet }, { data: bets }, { data: follow }] = await Promise.all([
      admin.from('wallets').select('balance').eq('user_id', user.id).single(),
      admin.from('bets').select('option_id,amount').eq('user_id', user.id).eq('market_id', id).limit(1),
      admin.from('market_follows').select('id').eq('user_id', user.id).eq('market_id', id).maybeSingle(),
    ])
    balance    = wallet?.balance ?? null
    userBet    = bets?.[0] ?? null
    isFollowing = !!follow
  }

  if (market.created_by) {
    const { data: cp } = await admin
      .from('profiles')
      .select('full_name,verified_creator,username')
      .eq('id', market.created_by)
      .single()
    if (cp?.full_name) {
      const parts = cp.full_name.trim().split(/\s+/)
      creatorInfo = {
        name:     parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0],
        username: cp.username ?? null,
        verified: cp.verified_creator ?? false,
      }
    }
  }

  const { data: bettorRows } = await admin
    .from('bets')
    .select('user_id')
    .eq('market_id', id)
    .neq('status', 'cancelled')
  const predictorCount = new Set((bettorRows ?? []).map((b: { user_id: string }) => b.user_id)).size

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: market.title,
    url: `https://sabula256.com/markets/${market.id}`,
    organizer: { '@type': 'Organization', name: 'Sabula 256', url: 'https://sabula256.com' },
    ...(market.closes_at ? { endDate: market.closes_at } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <GlobalMarketHeader isLoggedIn={!!user} balance={balance} />
      <MarketPageClient
        market={market as MarketData}
        outcomes={outcomes}
        initialBalance={balance}
        isLoggedIn={!!user}
        userBet={userBet}
        predictorCount={predictorCount}
        accessToken={sp.t ?? null}
        creatorInfo={creatorInfo}
      />
      <div className="mx-auto max-w-7xl px-4 pb-2 flex justify-end bg-black">
        <FollowButton marketId={id} initialFollowing={isFollowing} isLoggedIn={!!user} />
      </div>
    </>
  )
}
