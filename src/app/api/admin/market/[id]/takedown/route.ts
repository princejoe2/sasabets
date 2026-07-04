import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cancelAndRefundMarket } from '@/lib/refund-market'

// Admin takedown of a bad community market: cancels it and refunds every active
// bet (including the creator's launch stake). Preserves instant go-live —
// moderation happens after the fact.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const marketId = (await params).id
  let reason = 'admin_takedown'
  try {
    const body = await req.json()
    if (typeof body?.reason === 'string' && body.reason.trim()) reason = body.reason.trim().slice(0, 200)
  } catch { /* no body — use default reason */ }

  const result = await cancelAndRefundMarket(admin, marketId, { reason })
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Takedown failed' }, { status: 400 })
  }

  try {
    await admin.from('audit_log').insert({
      entity_type: 'market', action: 'admin_takedown',
      entity_id: marketId, actor_id: user.id, actor_type: 'admin',
      payload: { reason, refunded_bets: result.refundedBets, refunded_total: result.refundedTotal },
    })
  } catch { /* non-critical */ }

  return NextResponse.json({
    ok: true,
    refunded_bets: result.refundedBets,
    refunded_total: result.refundedTotal,
  })
}
