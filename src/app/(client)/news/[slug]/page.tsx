import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { marked, Renderer } from 'marked'
import { SITE_URL, breadcrumbLd, clip, ldJson, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const revalidate = 300

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// XSS hardening: article content is rendered via dangerouslySetInnerHTML, and marked
// passes raw HTML through by default. This renderer strips raw HTML blocks entirely,
// escapes code, and neutralises javascript:/data: link hrefs — standard Markdown
// (headings, bold, lists, links, code) still renders normally.
function safeMarkdownRenderer(): Renderer {
  const renderer = new Renderer()
  renderer.html = () => '' // strip raw HTML blocks entirely
  renderer.code = (code) =>
    `<pre><code>${code.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  renderer.link = ({ href, title, text }) => {
    const raw = (href ?? '').trim()
    // Strip whitespace/control chars before scheme check so "java\tscript:" can't slip by.
    const scheme = raw.toLowerCase().replace(/[\s\u0000-\u001f]/g, '')
    const safeHref = /^(javascript|data|vbscript):/.test(scheme) ? '#' : (raw || '#')
    const internal = safeHref.startsWith('/') || safeHref.startsWith('https://sabula256.com')
    const attrs = internal ? '' : ' target="_blank" rel="noopener noreferrer"'
    return `<a href="${escapeHtml(safeHref)}"${title ? ` title="${escapeHtml(title)}"` : ''}${attrs}>${escapeHtml(text)}</a>`
  }
  return renderer
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: post } = await admin
    .from('news_posts')
    .select('title, excerpt, cover_image_url, published_at, author')
    .eq('slug', slug)
    .lte('published_at', new Date().toISOString())
    .single()
  if (!post) return { title: 'Article not found', robots: { index: false, follow: false } }
  const url = `${SITE_URL}/news/${slug}`
  const description = post.excerpt ? clip(post.excerpt, 200) : undefined
  const image = post.cover_image_url
    ? { url: post.cover_image_url as string, width: 1200, height: 630, alt: post.title as string }
    : DEFAULT_OG_IMAGE
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    authors: [{ name: post.author ?? 'Sabula 256' }],
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: 'Sabula 256',
      locale: 'en_UG',
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author ?? 'Sabula 256'],
      images: [image],
    },
    twitter: { card: 'summary_large_image', site: '@sabula256', title: post.title, description, images: [image.url] },
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

  const url = `${SITE_URL}/news/${post.slug}`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      // Evergreen how-to guides are Articles; dated coverage is a NewsArticle.
      '@type': post.category === 'guides' ? 'Article' : 'NewsArticle',
      '@id': `${url}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      headline: post.title.slice(0, 110),
      description: post.excerpt ?? undefined,
      datePublished: post.published_at,
      dateModified: post.published_at,
      inLanguage: 'en-UG',
      articleSection: post.category ?? 'general',
      author: { '@type': 'Organization', name: post.author ?? 'Sabula 256', url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Sabula 256',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
      },
      url,
      image: post.cover_image_url ?? `${SITE_URL}/opengraph-image`,
    },
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'News & Guides', path: '/news' },
      { name: post.title, path: `/news/${post.slug}` },
    ]),
  ]

  const htmlContent = marked(post.content ?? '', { renderer: safeMarkdownRenderer(), gfm: true, breaks: true, async: false }) as string

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <div className="min-h-screen bg-mk-bg">
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt={post.title} width={1200} height={630} fetchPriority="high" decoding="async" className="h-64 w-full object-cover sm:h-80" />
        )}

        <div className="mx-auto max-w-2xl px-4 py-10">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-mk-muted">
            <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/news" className="hover:text-violet-400 transition-colors">News &amp; Guides</Link>
          </nav>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            {post.category && (
              <span className="rounded-full bg-violet-900/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-400">
                {post.category}
              </span>
            )}
            <span className="text-xs text-mk-muted">
              {new Date(post.published_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xs text-mk-muted">By {post.author ?? 'Sabula 256'}</span>
          </div>

          <h1 className="text-3xl font-black leading-tight text-mk-text sm:text-4xl">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-mk-secondary leading-relaxed">{post.excerpt}</p>
          )}

          <hr className="my-8 border-mk-border" />

          <div
            className="space-y-4 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-mk-text [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-mk-text [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-mk-text [&_h3]:mt-4 [&_p]:text-mk-secondary [&_p]:leading-relaxed [&_strong]:text-mk-text [&_em]:text-mk-secondary [&_a]:text-violet-400 [&_a:hover]:text-violet-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-mk-secondary [&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-violet-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-mk-muted"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="mt-12 rounded-2xl border border-violet-800/30 bg-violet-900/10 p-6 text-center">
            <p className="font-bold text-mk-text">Want to predict what happens next?</p>
            <p className="mt-1 text-sm text-mk-secondary">Join the market, back your side, and win on MTN or Airtel Mobile Money.</p>
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
