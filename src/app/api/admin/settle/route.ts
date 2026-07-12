import { NextRequest, NextResponse } from 'next/server'
import { settleMarket } from '@/lib/settle-market'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const { admin, user, isSuperAdmin } = g

  const { marketId, winningOptionId, settlementNote, evidenceUrl } = await req.json()

  // Prevent a non-super-admin from settling a market they created
  if (!isSuperAdmin) {
    const { data: mkt } = await admin.from('markets').select('created_by').eq('id', marketId).single()
    if (mkt?.created_by === user.id) {
      return NextResponse.json({ error: 'You cannot settle a market you created.' }, { status: 403 })
    }
  }

  const result = await settleMarket(admin, marketId, winningOptionId, settlementNote, evidenceUrl)

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
