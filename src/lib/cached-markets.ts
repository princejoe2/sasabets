import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/server'

// Shared, cross-visitor cache for the public market lists (homepage + /markets).
// Live odds still update in the browser via Supabase Realtime, so a 30 s cache
// only delays brand-new markets / settlements by at most 30 s.
//
// Payload is kept small: every open market + only the most recent settled/closed ones.

const COLS = 'id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata, is_featured'
const RECENT_CLOSED = 60

async function fetchPublicMarkets() {
  const sb = createPublicClient()
  const notPrivate = 'metadata->>private.is.null,metadata->>private.neq.true'

  const [openRes, closedRes] = await Promise.all([
    sb.from('markets').select(COLS)
      .or(notPrivate)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    sb.from('markets').select(COLS)
      .or(notPrivate)
      .not('status', 'in', '(open,pending_approval)')
      .order('created_at', { ascending: false })
      .limit(RECENT_CLOSED),
  ])

  const all = [...(openRes.data ?? []), ...(closedRes.data ?? [])]
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return all.map(m => ({
    ...m,
    options:     m.options as Array<{ id: string; label: string; total_pool: number }>,
    metadata:    (m.metadata ?? {}) as Record<string, unknown>,
    is_featured: m.is_featured ?? false,
  }))
}

export const getPublicMarkets = unstable_cache(fetchPublicMarkets, ['public-markets-v1'], {
  revalidate: 30,
  tags: ['markets'],
})

export type PublicMarket = Awaited<ReturnType<typeof fetchPublicMarkets>>[number]
