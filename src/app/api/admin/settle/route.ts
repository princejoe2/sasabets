import { NextRequest, NextResponse } from 'next/server'
import { settleMarket } from '@/lib/settle-market'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const { admin } = g

  const { marketId, winningOptionId, settlementNote, evidenceUrl } = await req.json()

  // Fetch market to check if user-created and enforce participation minimum
  const { data: market } = await admin
    .from('markets')
    .select('metadata, created_by, total_pool')
    .eq('id', marketId)
    .single()

  const meta = (market?.metadata ?? {}) as Record<string, unknown>
  const isUserCreated = meta.user_created === true

  // User-created markets require a settlement note (source/evidence)
  if (isUserCreated && !settlementNote?.trim()) {
    return NextResponse.json(
      { error: 'A settlement note (source or evidence) is required for community markets.' },
      { status: 400 }
    )
  }

  // Require at least 2 distinct non-creator bettors before settling a user market
  if (isUserCreated && market?.created_by) {
    const { data: bettors } = await admin
      .from('bets')
      .select('user_id')
      .eq('market_id', marketId)
      .eq('status', 'active')
      .neq('user_id', market.created_by)

    const uniqueNonCreator = new Set((bettors ?? []).map(b => b.user_id)).size
    if (uniqueNonCreator < 2) {
      return NextResponse.json(
        { error: 'Community markets need at least 2 other participants before they can be settled.' },
        { status: 400 }
      )
    }
  }

  const result = await settleMarket(admin, marketId, winningOptionId, settlementNote, evidenceUrl)

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
