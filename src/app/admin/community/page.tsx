import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import CommunityReviewClient, { type CommunityMarket } from './CommunityReviewClient'

export const metadata: Metadata = { title: 'Community Review – Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminCommunityPage() {
  const admin = createAdminClient()

  // Live community markets (user-created, not yet settled/cancelled).
  const { data: markets } = await admin
    .from('markets')
    .select('id, title, total_pool, status, created_at, created_by, metadata')
    .eq('metadata->>user_created', 'true')
    .in('status', ['pending_approval', 'open', 'closed', 'suspended'])
    .order('created_at', { ascending: false })
    .limit(200)

  const list = markets ?? []

  // Unique bettor counts per market (best-effort).
  const ids = list.map(m => m.id)
  const bettorCount: Record<string, number> = {}
  if (ids.length) {
    const { data: bets } = await admin
      .from('bets')
      .select('market_id, user_id')
      .in('market_id', ids)
      .eq('status', 'active')
    const perMarket: Record<string, Set<string>> = {}
    for (const b of bets ?? []) {
      ;(perMarket[b.market_id] ??= new Set()).add(b.user_id)
    }
    for (const [mid, set] of Object.entries(perMarket)) bettorCount[mid] = set.size
  }

  const rows: CommunityMarket[] = list.map(m => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      total_pool: Number(m.total_pool),
      created_at: m.created_at,
      creator_name: (meta.creator_name as string) ?? 'Community',
      bettors: bettorCount[m.id] ?? 0,
    }
  })

  return <CommunityReviewClient initialMarkets={rows} />
}
