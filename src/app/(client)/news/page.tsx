import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "News & Guides – Uganda Prediction Market Insights",
  description: "Guides and news from Sabula 256: how prediction markets work, depositing with Mobile Money, and the Ugandan football, politics and economy stories behind the markets.",
  path: "/news"
})

export const revalidate = 300

const CAT_COLORS: Record<string, string> = {
  football:      '#a3e635',
  politics:      '#60a5fa',
  economy:       '#fbbf24',
  entertainment: '#f472b6',
  tech:          '#22d3ee',
  general:       '#a78bfa',
  guides:        '#fb923c',
}

export default async function NewsPage() {
  const admin = createAdminClient()
  const { data: posts } = await admin
    .from('news_posts')
    .select('slug, title, excerpt, category, cover_image_url, author, published_at')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(40)

  const all = posts ?? []

  return (
    <div className="min-h-screen bg-mk-surface">
      <div className="border-b border-mk-border bg-mk-card px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Sabula 256</p>
          <h1 className="text-4xl font-black text-mk-text">News & Guides</h1>
          <p className="mt-2 text-mk-secondary">How prediction markets work, plus the Ugandan sports, politics and economy stories behind the markets.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {all.length === 0 ? (
          <div className="py-20 text-center text-mk-muted">No posts yet. Check back soon.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {all.map(post => {
              const color = CAT_COLORS[post.category ?? 'general'] ?? CAT_COLORS.general
              return (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-mk-border bg-mk-card transition-colors hover:border-violet-600/40"
                >
                  {post.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      width={640}
                      height={352}
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${color}20`, color }}
                      >
                        {post.category ?? 'general'}
                      </span>
                      <span className="text-[10px] text-mk-muted">
                        {new Date(post.published_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="font-black text-mk-text leading-snug group-hover:text-violet-300 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-mk-secondary leading-relaxed line-clamp-3">{post.excerpt}</p>
                    )}
                    <p className="mt-3 text-xs text-mk-muted">By {post.author ?? 'Sabula 256'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
