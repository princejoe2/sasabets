import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

type Params = { params: Promise<{ id: string }> }

// ── GET: list outcomes for a market ──────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const { admin } = g
  const { id: marketId } = await params

  const { data, error } = await admin
    .from('market_outcomes')
    .select('id,slug,name,image_url,image_source,image_credit,image_override,image_needs_review,sort_order,status,color_index,probability')
    .eq('market_id', marketId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outcomes: data ?? [] })
}

// ── PATCH: upsert all outcomes for a market ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const { admin } = g
  const { id: marketId } = await params

  const { outcomes } = await req.json() as {
    outcomes: Array<{
      slug: string
      name: string
      image_url?: string | null
      image_source?: string | null
      image_credit?: string | null
      image_override?: boolean
      image_needs_review?: boolean
      sort_order: number
      status?: string
    }>
  }

  if (!Array.isArray(outcomes) || outcomes.length < 2) {
    return NextResponse.json({ error: 'At least 2 outcomes required' }, { status: 400 })
  }

  const { data: market } = await admin.from('markets').select('id, options').eq('id', marketId).single()
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  const rawOpts = Array.isArray(market.options)
    ? market.options as Array<{ id: string; label: string; total_pool: number }>
    : []
  const isBinary = rawOpts.every(o => ['yes', 'no', 'up', 'down'].includes(o.id))

  for (const [i, outcome] of outcomes.entries()) {
    await admin.from('market_outcomes').upsert({
      market_id:          marketId,
      slug:               outcome.slug,
      name:               outcome.name,
      image_url:          outcome.image_url ?? null,
      image_source:       outcome.image_source ?? null,
      image_credit:       outcome.image_credit ?? null,
      image_override:     outcome.image_override ?? false,
      image_needs_review: outcome.image_needs_review ?? false,
      sort_order:         outcome.sort_order ?? i,
      status:             outcome.status ?? 'active',
      color_index:        i % 8,
    }, { onConflict: 'market_id,slug' })
  }

  // For multi-candidate markets: sync options JSONB to match the outcome list
  if (!isBinary) {
    const newOptions = outcomes.flatMap((o, i) => [
      { id: `${o.slug}_yes`, label: `${o.name} YES`, total_pool: rawOpts.find(r => r.id === `${o.slug}_yes`)?.total_pool ?? 0 },
      { id: `${o.slug}_no`,  label: `${o.name} NO`,  total_pool: rawOpts.find(r => r.id === `${o.slug}_no`)?.total_pool ?? 0 },
    ])
    await admin.from('markets').update({ options: newOptions }).eq('id', marketId)
  }

  return NextResponse.json({ success: true, count: outcomes.length })
}

// ── DELETE: remove a single outcome by id ───────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const g = await guardAdmin(['moderator'])
  if ('error' in g) return g.error
  const { admin } = g
  const { id: marketId } = await params

  const { outcomeId } = await req.json() as { outcomeId: string }
  if (!outcomeId) return NextResponse.json({ error: 'outcomeId required' }, { status: 400 })

  // Confirm it belongs to this market
  const { data: outcome } = await admin
    .from('market_outcomes')
    .select('id, slug')
    .eq('id', outcomeId)
    .eq('market_id', marketId)
    .single()

  if (!outcome) return NextResponse.json({ error: 'Outcome not found' }, { status: 404 })

  // Safety: must not be a binary slug — those can't be removed individually
  if (['yes', 'no', 'up', 'down'].includes(outcome.slug)) {
    return NextResponse.json({ error: 'Cannot delete binary outcomes individually' }, { status: 400 })
  }

  await admin.from('market_outcomes').delete().eq('id', outcomeId)

  // Also remove the matching _yes/_no option entries from the JSONB
  const { data: market } = await admin.from('markets').select('options').eq('id', marketId).single()
  if (market) {
    const rawOpts = Array.isArray(market.options)
      ? market.options as Array<{ id: string }>
      : []
    const filtered = rawOpts.filter(o => o.id !== `${outcome.slug}_yes` && o.id !== `${outcome.slug}_no`)
    await admin.from('markets').update({ options: filtered }).eq('id', marketId)
  }

  return NextResponse.json({ success: true })
}
