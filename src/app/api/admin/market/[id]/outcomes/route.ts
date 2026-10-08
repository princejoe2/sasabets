import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const { admin } = g

  const { id: marketId } = await params
  const { outcomes } = await req.json() as {
    outcomes: Array<{ slug: string; name: string; image_url?: string | null; sort_order: number; status?: string }>
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
      market_id:   marketId,
      slug:        outcome.slug,
      name:        outcome.name,
      image_url:   outcome.image_url ?? null,
      sort_order:  outcome.sort_order ?? i,
      status:      outcome.status ?? 'active',
      color_index: i % 8,
    }, { onConflict: 'market_id,slug' })
  }

  if (!isBinary) {
    const newOptions = outcomes.flatMap((o, i) => [
      { id: `${o.slug}_yes`, label: `${o.name} YES`, total_pool: rawOpts.find(r => r.id === `${o.slug}_yes`)?.total_pool ?? 0 },
      { id: `${o.slug}_no`,  label: `${o.name} NO`,  total_pool: rawOpts.find(r => r.id === `${o.slug}_no`)?.total_pool ?? 0 },
    ])
    await admin.from('markets').update({ options: newOptions }).eq('id', marketId)
  }

  return NextResponse.json({ success: true, count: outcomes.length })
}
