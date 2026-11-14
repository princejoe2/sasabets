import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { CATEGORY_PAGES, detectCat } from '@/lib/market-categories'

export const dynamic = 'force-dynamic'

const BASE = 'https://sabula256.com'

// Last time the copy of the static pages was meaningfully edited. Bump when editing them —
// a real date is better than "now", which search engines learn to ignore.
const STATIC_UPDATED = new Date('2026-11-14T00:00:00Z')

type MarketRow = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  settled_at: string | null
  last_bet_at: string | null
  metadata: Record<string, unknown> | null
}

function latest(...dates: Array<string | null | undefined>): Date {
  const ts = dates.filter((d): d is string => !!d).map(d => new Date(d).getTime()).filter(n => !Number.isNaN(n))
  return ts.length ? new Date(Math.max(...ts)) : STATIC_UPDATED
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  const [{ data: marketsRaw }, { data: newsPosts }] = await Promise.all([
    admin
      .from('markets')
      .select('id, title, description, status, created_at, settled_at, last_bet_at, metadata')
      // Public, indexable states only (no pending_approval / suspended / cancelled).
      .in('status', ['open', 'closed', 'settled'])
      .order('created_at', { ascending: false })
      .limit(5000),
    admin
      .from('news_posts')
      .select('slug, published_at, cover_image_url')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(1000),
  ])

  // Private (invite-only) markets must never be listed.
  const markets = ((marketsRaw ?? []) as MarketRow[]).filter(m => m.metadata?.private !== true)

  const marketUrls: MetadataRoute.Sitemap = markets.map(m => ({
    url: `${BASE}/markets/${m.id}`,
    lastModified: latest(m.created_at, m.last_bet_at, m.settled_at),
    changeFrequency: m.status === 'open' ? 'hourly' : m.status === 'closed' ? 'daily' : 'monthly',
    priority: m.status === 'open' ? 0.9 : m.status === 'closed' ? 0.6 : 0.4,
    images: [`${BASE}/markets/${m.id}/opengraph-image`],
  }))

  const newsUrls: MetadataRoute.Sitemap = (newsPosts ?? []).map(p => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: new Date(p.published_at),
    changeFrequency: 'monthly',
    priority: 0.7,
    ...(p.cover_image_url ? { images: [p.cover_image_url as string] } : {}),
  }))

  // Listing pages change whenever a market in them does.
  const newestMarket = markets.length
    ? new Date(Math.max(...markets.map(m => latest(m.created_at, m.last_bet_at, m.settled_at).getTime())))
    : STATIC_UPDATED
  const newestNews = newsPosts?.length ? new Date(newsPosts[0].published_at) : STATIC_UPDATED

  const categoryUrls: MetadataRoute.Sitemap = CATEGORY_PAGES.map(c => {
    const inCat = markets.filter(m => detectCat(m.title, m.description ?? '', m.metadata ?? undefined) === c.slug)
    return {
      url: `${BASE}/markets/category/${c.slug}`,
      lastModified: inCat.length
        ? new Date(Math.max(...inCat.map(m => latest(m.created_at, m.last_bet_at, m.settled_at).getTime())))
        : STATIC_UPDATED,
      changeFrequency: 'daily',
      priority: 0.8,
    }
  })

  // NOTE: /create is intentionally absent — it redirects anonymous visitors (and crawlers) to /auth.
  return [
    { url: BASE,                           lastModified: newestMarket,   changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/markets`,              lastModified: newestMarket,   changeFrequency: 'hourly',  priority: 0.9 },
    ...categoryUrls,
    { url: `${BASE}/updown`,               lastModified: newestMarket,   changeFrequency: 'hourly',  priority: 0.7 },
    { url: `${BASE}/news`,                 lastModified: newestNews,     changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/leaderboard`,          lastModified: newestMarket,   changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/proposals`,            lastModified: STATIC_UPDATED, changeFrequency: 'daily',   priority: 0.5 },
    { url: `${BASE}/about`,                lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/faq`,                  lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/help`,                 lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/responsible-gambling`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,                lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/privacy`,              lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.2 },
    ...newsUrls,
    ...marketUrls,
  ]
}
