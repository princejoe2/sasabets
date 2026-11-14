import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublicMarkets, type PublicMarket } from '@/lib/cached-markets'
import { CATEGORY_PAGES, detectCat, getCategoryPage } from '@/lib/market-categories'
import { SITE_URL, breadcrumbLd, ldJson, pageMeta } from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const cat = getCategoryPage(slug)
  if (!cat) return { title: 'Category not found', robots: { index: false, follow: false } }
  return pageMeta({
    title: cat.title,
    description: cat.description,
    path: `/markets/category/${cat.slug}`,
    keywords: cat.keywords,
  })
}

function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString('en-UG')}`
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })
}

function leader(m: PublicMarket) {
  const pool = Number(m.total_pool)
  const opts = (m.options ?? []).filter(Boolean)
  if (pool <= 0 || opts.length === 0) return null
  const top = [...opts].sort((a, b) => Number(b.total_pool) - Number(a.total_pool))[0]
  if (!top || Number(top.total_pool) <= 0) return null
  return { label: top.label, pct: Math.round((Number(top.total_pool) / pool) * 100) }
}

function MarketRow({ m }: { m: PublicMarket }) {
  const lead = leader(m)
  const closes = fmtDate(m.closes_at)
  const isOpen = m.status === 'open'
  return (
    <li>
      <Link
        href={`/markets/${m.id}`}
        className="block rounded-2xl border border-mk-border bg-mk-card p-4 transition-colors hover:border-mk-accent/50"
      >
        <h3 className="font-bold leading-snug text-mk-text">{m.title}</h3>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mk-muted">
          <span>{isOpen ? 'Open' : m.status === 'settled' ? 'Settled' : 'Closed'}</span>
          {Number(m.total_pool) > 0 && <span>Pool {fmtPool(Number(m.total_pool))}</span>}
          {lead && isOpen && <span>Leading: {lead.label} ({lead.pct}%)</span>}
          {closes && <span>{isOpen ? 'Closes' : 'Closed'} {closes}</span>}
        </p>
      </Link>
    </li>
  )
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cat = getCategoryPage(slug)
  if (!cat) notFound()

  const all = await getPublicMarkets()
  const inCat = all.filter(m => detectCat(m.title, m.description ?? '', m.metadata) === cat.slug)
  const open = inCat
    .filter(m => m.status === 'open')
    .sort((a, b) => Number(b.total_pool) - Number(a.total_pool))
  const past = inCat.filter(m => m.status !== 'open').slice(0, 12)

  const path = `/markets/category/${cat.slug}`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}${path}`,
      url: `${SITE_URL}${path}`,
      name: cat.title,
      description: cat.description,
      inLanguage: 'en-UG',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: open.length,
        itemListElement: open.slice(0, 30).map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: m.title,
          url: `${SITE_URL}/markets/${m.id}`,
        })),
      },
    },
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Markets', path: '/markets' },
      { name: cat.label, path },
    ]),
  ]

  return (
    <div className="min-h-screen bg-mk-bg page-enter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />

      <div className="border-b border-mk-border bg-mk-card px-4 pt-8 pb-6">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-mk-muted">
            <Link href="/" className="hover:text-mk-text">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/markets" className="hover:text-mk-text">Markets</Link>
            <span className="mx-1.5">/</span>
            <span className="text-mk-secondary">{cat.label}</span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight text-mk-text sm:text-4xl">{cat.h1}</h1>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-mk-secondary">
            {cat.intro.map(p => <p key={p}>{p}</p>)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <section>
          <h2 className="mb-4 text-lg font-black text-mk-text">
            Open {cat.label.toLowerCase()} markets{open.length > 0 ? ` (${open.length})` : ''}
          </h2>
          {open.length === 0 ? (
            <p className="rounded-2xl border border-mk-border bg-mk-card p-6 text-sm text-mk-muted">
              No open {cat.label.toLowerCase()} markets right now.{' '}
              <Link href="/create" className="font-semibold text-mk-accent hover:underline">Create one</Link>{' '}
              or <Link href="/proposals" className="font-semibold text-mk-accent hover:underline">suggest a question</Link>.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {open.map(m => <MarketRow key={m.id} m={m} />)}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-black text-mk-text">Recently closed and settled</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {past.map(m => <MarketRow key={m.id} m={m} />)}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-mk-border bg-mk-card p-6">
          <h2 className="text-lg font-black text-mk-text">How these markets work</h2>
          <p className="mt-2 text-sm leading-relaxed text-mk-secondary">
            Pick an outcome and stake from UGX 1,000 using your wallet, funded by MTN or Airtel Mobile Money.
            All stakes go into one pool. When the market is settled, winners share the pool in proportion to
            their stake; an 8% platform fee applies only to pools of UGX 50,000 or more. You must be 18 or older.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/faq" className="text-mk-accent hover:underline">How prediction markets work</Link>
            <Link href="/help" className="text-mk-accent hover:underline">Deposits and withdrawals</Link>
            <Link href="/responsible-gambling" className="text-mk-accent hover:underline">Responsible play</Link>
          </p>
        </section>

        <nav aria-label="Other categories">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-mk-muted">More categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PAGES.filter(c => c.slug !== cat.slug).map(c => (
              <Link
                key={c.slug}
                href={`/markets/category/${c.slug}`}
                className="rounded-full border border-mk-border bg-mk-raised px-3 py-1 text-xs font-semibold text-mk-secondary transition-colors hover:border-mk-accent/50 hover:text-mk-text"
              >
                {c.label}
              </Link>
            ))}
            <Link
              href="/markets"
              className="rounded-full border border-mk-border bg-mk-raised px-3 py-1 text-xs font-semibold text-mk-secondary transition-colors hover:border-mk-accent/50 hover:text-mk-text"
            >
              All markets
            </Link>
          </div>
        </nav>
      </div>
    </div>
  )
}
