import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 300

const CAT_COLORS: Record<string, string> = {
  football:      '#a3e635',
  politics:      '#60a5fa',
  economy:       '#fbbf24',
  entertainment: '#f472b6',
  tech:          '#22d3ee',
  general:       '#a78bfa',
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Sabula 256</p>
          <h1 className="text-4xl font-black text-white">News & Insights</h1>
          <p className="mt-2 text-slate-500">Uganda sports, politics, and economy — the events behind the markets.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {all.length === 0 ? (
          <div className="py-20 text-center text-slate-600">No posts yet. Check back soon.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {all.map(post => {
              const color = CAT_COLORS[post.category ?? 'general'] ?? CAT_COLORS.general
              return (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] transition-colors hover:border-violet-600/40"
                >
                  {post.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
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
                      <span className="text-[10px] text-slate-600">
                        {new Date(post.published_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="font-black text-slate-100 leading-snug group-hover:text-violet-300 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-3">{post.excerpt}</p>
                    )}
                    <p className="mt-3 text-xs text-slate-600">By {post.author ?? 'Sabula 256'}</p>
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
