import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/market-token'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MarketPageClient from './MarketPageClient'
import GlobalMarketHeader from '@/components/GlobalMarketHeader'
import FollowButton from '@/components/FollowButton'
import type { MarketOutcome, MarketData } from './types'
import { SITE_URL, breadcrumbLd, clip, ldJson } from '@/lib/seo'
import { detectCat, getCategoryPage } from '@/lib/market-categories'

const PUBLIC_STATUSES = ['open', 'closed', 'settled']
const NOINDEX = { index: false, follow: false, googleBot: { index: false, follow: false } }

type Opt = { id: string; label: string; total_pool: number }
function readOptions(raw: unknown): Opt[] {
  const arr = Array.isArray(raw) ? raw : (raw as { value?: unknown[] } | null)?.value
  return Array.isArray(arr) ? (arr as Opt[]).filter(Boolean) : []
}
function fmtPool(pool: number) {
  return pool >= 1_000_000
    ? `UGX ${(pool / 1_000_000).toFixed(1)}M`
    : pool >= 1_000 ? `UGX ${Math.round(pool / 1_000)}K` : `UGX ${pool.toLocaleString('en-UG')}`
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  const { data: m } = await admin
    .from('markets')
    .select('title, description, options, total_pool, status, winning_option_id, metadata')
    .eq('id', id)
    .single()
  // Unknown id: the page streams a 404 UI with HTTP 200, so make sure it is never indexed.
  if (!m) return { title: 'Market not found', robots: NOINDEX }

  const meta = (m.metadata ?? {}) as Record<string, unknown>
  if (meta.private === true) {
    return { title: 'Private Market', description: 'This market is invite-only.', robots: NOINDEX }
  }
  // pending_approval / suspended / cancelled markets are not public content.
  if (!PUBLIC_STATUSES.includes(m.status)) {
    return { title: m.title, robots: NOINDEX }
  }

  const opts = readOptions(m.options)
  const pool = Number(m.total_pool)
  const baseDesc = m.description ?? (opts.length >= 2 ? `${opts[0].label} vs ${opts[1].label}` : m.title)
  const winner = opts.find(o => o.id === m.winning_option_id)?.label

  // Lead with the market's real state so search snippets are accurate after it closes.
  let lead: string
  if (m.status === 'settled') lead = winner ? `Settled — result: ${winner}.` : 'Settled.'
  else if (m.status === 'closed') lead = 'Predictions closed — awaiting settlement.'
  else lead = pool > 0 ? `Open market · ${fmtPool(pool)} pool.` : 'Open market.'
  const desc = clip(`${lead} ${baseDesc}`, 200)

  const canonical  = `${SITE_URL}/markets/${id}`
  const socialTitle = `${m.title} | Sabula 256`
  return {
    title: m.title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: socialTitle, description: desc, siteName: 'Sabula 256', locale: 'en_UG', type: 'website', url: canonical,
    },
    // No explicit images: the sibling opengraph-image.tsx is injected by Next with its real
    // (hash-suffixed, because of the (client) route group) URL. A hand-built
    // /markets/<id>/opengraph-image URL 404s.
    twitter: { card: 'summary_large_image', site: '@sabula256', title: socialTitle, description: desc },
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
      'id,title,description,total_pool,options,closes_at,status,rake_pct,winning_option_id,settlement_evidence_url,metadata,created_by,created_at,settled_at,last_bet_at'
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-mk-bg px-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-900/20 text-4xl">🔒</div>
          <h1 className="text-2xl font-black text-mk-text">Private Market</h1>
          <p className="mt-3 max-w-xs text-sm text-mk-muted leading-relaxed">
            This market is invite-only. You need the creator&apos;s secret link.
          </p>
        </div>
      )
    }
  }

  if (market.status === 'pending_approval' && (!user || market.created_by !== user.id)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mk-bg px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-900/20 text-4xl">🕐</div>
        <h1 className="text-2xl font-black text-mk-text">Market Under Review</h1>
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

  // ── Structured data ────────────────────────────────────────────────────────
  // A market is a question with crowd-backed answers, so it is described as a
  // WebPage whose mainEntity is a Question. (It was previously typed as an Event
  // with Offers, which mis-stated settled markets as "cancelled" and payout
  // multipliers as prices.) Private / non-public markets get no structured data.
  const pool = Number(market.total_pool)
  const isPublic = meta.private !== true && PUBLIC_STATUSES.includes(market.status)
  const ldOpts = readOptions(market.options)
  const pageUrl = `${SITE_URL}/markets/${market.id}`
  const cat = detectCat(market.title, market.description ?? '', meta)
  const catPage = getCategoryPage(cat)
  const modified = [market.created_at, market.last_bet_at, market.settled_at]
    .filter((d): d is string => !!d).sort().pop()
  const statusText = market.status === 'settled' ? 'Settled' : market.status === 'closed' ? 'Closed — awaiting settlement' : 'Open'
  const answer = (o: Opt) => ({
    '@type': 'Answer',
    text: pool > 0 && Number(o.total_pool) > 0
      ? `${o.label} — ${Math.round((Number(o.total_pool) / pool) * 100)}% of the pool`
      : o.label,
    url: pageUrl,
  })
  const winnerOpt = market.status === 'settled' ? ldOpts.find(o => o.id === market.winning_option_id) : undefined
  const criteria = typeof meta.resolution_criteria === 'string' ? meta.resolution_criteria : null
  const jsonLd = isPublic ? [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: market.title,
      ...(market.description ? { description: market.description } : {}),
      inLanguage: 'en-UG',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      datePublished: market.created_at,
      ...(modified ? { dateModified: modified } : {}),
      mainEntity: {
        '@type': 'Question',
        name: market.title,
        text: criteria ?? market.description ?? market.title,
        dateCreated: market.created_at,
        answerCount: ldOpts.length,
        creativeWorkStatus: statusText,
        ...(market.closes_at ? { expires: market.closes_at } : {}),
        ...(winnerOpt
          ? { acceptedAnswer: { '@type': 'Answer', text: winnerOpt.label, url: pageUrl, ...(market.settled_at ? { dateCreated: market.settled_at } : {}) } }
          : { suggestedAnswer: ldOpts.map(answer) }),
      },
    },
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Markets', path: '/markets' },
      ...(catPage ? [{ name: catPage.label, path: `/markets/category/${catPage.slug}` }] : []),
      { name: market.title, path: `/markets/${market.id}` },
    ]),
  ] : null

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      )}
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
      <div className="mx-auto max-w-7xl px-4 pb-2 flex justify-end bg-mk-bg">
        <FollowButton marketId={id} initialFollowing={isFollowing} isLoggedIn={!!user} />
      </div>
    </>
  )
}
