import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const AUTO_APPROVE_THRESHOLD = 10

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId, remove } = await req.json()
  if (!proposalId) return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 })

  if (remove) {
    await admin.from('proposal_votes').delete().eq('user_id', user.id).eq('proposal_id', proposalId)
    await admin.rpc('decrement_proposal_votes', { pid: proposalId })
    return NextResponse.json({ ok: true })
  }

  // Add vote
  const { error: vErr } = await admin.from('proposal_votes').insert({ user_id: user.id, proposal_id: proposalId })
  if (vErr) return NextResponse.json({ error: 'Already voted' }, { status: 409 })
  await admin.rpc('increment_proposal_votes', { pid: proposalId })

  // Check if threshold reached → auto-create market
  const { data: p } = await admin.from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single()

  if (p && p.status === 'pending' && (p.vote_count ?? 0) >= AUTO_APPROVE_THRESHOLD) {
    // Auto-create the market
    const closesAt = p.closes_suggestion
      ? new Date(p.closes_suggestion)
      : new Date(Date.now() + 7 * 86400000)

    const options = [
      { id: 'opt_a', label: p.option_a, total_pool: 0 },
      { id: 'opt_b', label: p.option_b, total_pool: 0 },
    ]

    const { data: market } = await admin.from('markets').insert({
      title:       p.title,
      description: p.description ?? null,
      closes_at:   closesAt.toISOString(),
      status:      'open',
      options,
      total_pool:  0,
      rake_pct:    0.08,
      metadata:    { source: 'community_proposal', proposal_id: proposalId },
    }).select('id').single()

    if (market) {
      await admin.from('proposals').update({
        status:     'approved',
        market_id:  market.id,
        updated_at: new Date().toISOString(),
      }).eq('id', proposalId)
    }
  }

  return NextResponse.json({ ok: true })
}
