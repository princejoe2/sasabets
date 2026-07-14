import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import SettleQueueClient, { type QueueMarket } from './SettleQueueClient'

export const metadata: Metadata = { title: 'Settlement Queue – Admin' }
export const dynamic = 'force-dynamic'

export default async function SettleQueuePage() {
  const admin = createAdminClient()

  const now = new Date().toISOString()
  const { data: markets } = await admin
    .from('markets')
    .select('id, title, total_pool, closes_at, options, metadata, description, rake_pct, verification_type, verification_config, created_by, status')
    .or(`status.eq.closed,and(status.eq.open,closes_at.lt.${now})`)
    .order('closes_at', { ascending: true })

  const list = markets ?? []
  const ids  = list.map(m => m.id)

  const bettorMap:           Record<string, Set<string>> = {}
  const nonCreatorBettorMap: Record<string, Set<string>> = {}

  if (ids.length) {
    const { data: bets } = await admin
      .from('bets')
      .select('market_id, user_id')
      .in('market_id', ids)
      .eq('status', 'active')

    const createdByMap: Record<string, string | null> = {}
    for (const m of list) createdByMap[m.id] = m.created_by ?? null

    for (const b of bets ?? []) {
      ;(bettorMap[b.market_id] ??= new Set()).add(b.user_id)
      const creator = createdByMap[b.market_id]
      if (!creator || b.user_id !== creator) {
        ;(nonCreatorBettorMap[b.market_id] ??= new Set()).add(b.user_id)
      }
    }
  }

  const rows: QueueMarket[] = list.map(m => ({
    id:                m.id,
    title:             m.title,
    total_pool:        Number(m.total_pool),
    closes_at:         m.closes_at,
    options:           (m.options as QueueMarket['options']) ?? [],
    metadata:          (m.metadata ?? {}) as Record<string, unknown>,
    description:       (m as { description?: string | null }).description ?? null,
    bettors:           bettorMap[m.id]?.size ?? 0,
    nonCreatorBettors: nonCreatorBettorMap[m.id]?.size ?? 0,
    status:            m.status,
  }))

  return <SettleQueueClient markets={rows} />
}
