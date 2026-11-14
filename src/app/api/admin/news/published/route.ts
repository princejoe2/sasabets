import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { pingIndexNow } from '@/lib/indexnow'

/**
 * Called by /admin/news right after a post is inserted. Refreshes the cached
 * news pages and tells IndexNow (Bing, Yandex, etc.) about the new URL.
 */
export async function POST(req: NextRequest) {
  const { guardAdmin } = await import('@/lib/admin-guard')
  const g = await guardAdmin(['content'])
  if ('error' in g) return g.error

  const body = await req.json().catch(() => null) as { slug?: unknown } | null
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  // Only ping for a post that really exists and is already published.
  const { data: post } = await g.admin
    .from('news_posts')
    .select('slug')
    .eq('slug', slug)
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  revalidatePath('/news')
  revalidatePath(`/news/${slug}`)
  await pingIndexNow([
    `https://sabula256.com/news/${slug}`,
    'https://sabula256.com/news',
  ])

  return NextResponse.json({ ok: true })
}
