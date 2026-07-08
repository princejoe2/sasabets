import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { marked } from 'marked'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: post } = await admin.from('news_posts').select('title, excerpt, cover_image_url, published_at').eq('slug', slug).single()
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `https://sabula256.com/news/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `https://sabula256.com/news/${slug}`,
      type: 'article',
      publishedTime: post.published_at,
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url, width: 1200, height: 630, alt: post.title }] } : {}),
    },
  }
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: post } = await admin
    .from('news_posts')
    .select('slug, title, excerpt, content, category, cover_image_url, author, published_at')
    .eq('slug', slug)
    .lte('published_at', new Date().toISOString())
    .single()

  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: post.author ?? 'Sabula 256', url: 'https://sabula256.com' },
    publisher: { '@type': 'Organization', name: 'Sabula 256', url: 'https://sabula256.com' },
    url: `https://sabula256.com/news/${post.slug}`,
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
  }

  const htmlContent = marked(post.content ?? '', { async: false }) as string

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[#0a0a0f]">
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt={post.title} className="h-64 w-full object-cover sm:h-80" />
        )}

        <div className="mx-auto max-w-2xl px-4 py-10">
          <Link href="/news" className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors">
            ← Back to News
          </Link>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            {post.category && (
              <span className="rounded-full bg-violet-900/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-400">
                {post.category}
              </span>
            )}
            <span className="text-xs text-slate-600">
              {new Date(post.published_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xs text-slate-600">By {post.author ?? 'Sabula 256'}</span>
          </div>

          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">{post.excerpt}</p>
          )}

          <hr className="my-8 border-[#1e1e2e]" />

          <div
            className="space-y-4 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-200 [&_h3]:mt-4 [&_p]:text-slate-300 [&_p]:leading-relaxed [&_strong]:text-white [&_em]:text-slate-300 [&_a]:text-violet-400 [&_a:hover]:text-violet-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-slate-300 [&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-violet-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="mt-12 rounded-2xl border border-violet-800/30 bg-violet-900/10 p-6 text-center">
            <p className="font-bold text-white">Want to predict what happens next?</p>
            <p className="mt-1 text-sm text-slate-400">Join the market, back your side, and win on MTN or Airtel Mobile Money.</p>
            <Link
              href="/markets"
              className="mt-4 inline-block rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
            >
              Browse markets →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
