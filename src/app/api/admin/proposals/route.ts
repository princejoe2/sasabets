import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { proposalId, action, closesAt, adminNote } = await req.json()
  if (!proposalId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (action === 'reject') {
    await admin.from('proposals').update({ status: 'rejected', admin_note: adminNote ?? null, updated_at: new Date().toISOString() }).eq('id', proposalId)
    return NextResponse.json({ ok: true })
  }

  // Approve: create the market, then link it back
  const { data: p } = await admin.from('proposals').select('*').eq('id', proposalId).single()
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const options = [
    { id: 'opt-0', label: p.option_a, total_pool: 0 },
    { id: 'opt-1', label: p.option_b, total_pool: 0 },
  ]

  const { data: market, error: mErr } = await admin.from('markets').insert({
    title:       p.title,
    description: p.description ?? null,
    closes_at:   closesAt,
    status:      'open',
    options,
    total_pool:  0,
    rake_pct:    0.08,
    metadata:    { source: 'community_proposal', proposal_id: proposalId },
  }).select('id').single()

  if (mErr || !market) return NextResponse.json({ error: mErr?.message ?? 'Market creation failed' }, { status: 500 })

  await admin.from('proposals').update({
    status:     'approved',
    market_id:  market.id,
    admin_note: adminNote ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', proposalId)

  return NextResponse.json({ ok: true, marketId: market.id })
}
