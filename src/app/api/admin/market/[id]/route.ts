import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, closesAt, optALabel, optBLabel, verificationType, verificationConfig, rakePct, category, partyImage, team1Image, team2Image } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const rake = rakePct !== undefined ? Number(rakePct) : undefined
  if (rake !== undefined && (!Number.isFinite(rake) || rake < 0 || rake > 0.20)) {
    return NextResponse.json({ error: 'rake_pct must be between 0 and 0.20' }, { status: 400 })
  }

  // Duplicate title check — exclude this market itself
  const { data: dup } = await admin
    .from('markets').select('id')
    .ilike('title', title.trim())
    .in('status', ['open', 'upcoming'])
    .neq('id', params.id)
    .limit(1).maybeSingle()
  if (dup) return NextResponse.json({ error: 'Another market with this title already exists.' }, { status: 409 })

  // Fetch current market to preserve option pools and existing metadata
  const { data: current } = await admin.from('markets').select('options, metadata').eq('id', params.id).single()
  if (!current) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  const currentOpts = current.options as Array<{ id: string; label: string; total_pool: number }>
  const updatedOptions = currentOpts.map((opt, i) => ({
    ...opt,
    label: i === 0 ? (optALabel ?? opt.label) : (optBLabel ?? opt.label),
  }))

  const existingMeta = (current.metadata ?? {}) as Record<string, unknown>
  const VALID_CATS = ['football','politics','economy','entertainment','tech','infrastructure','agriculture','default']
  const safeCategory = category && VALID_CATS.includes(category) ? category : null

  const newMeta: Record<string, unknown> = {
    ...existingMeta,
    ...(safeCategory !== null ? { category: safeCategory } : {}),
  }
  // Update image keys: explicit null clears, undefined keeps existing, string replaces
  if (partyImage !== undefined) { if (partyImage) newMeta.partyImage = partyImage; else delete newMeta.partyImage }
  if (team1Image !== undefined) { if (team1Image) newMeta.team1Image = team1Image; else delete newMeta.team1Image }
  if (team2Image !== undefined) { if (team2Image) newMeta.team2Image = team2Image; else delete newMeta.team2Image }

  const { error } = await admin.from('markets').update({
    title:               title.trim(),
    description:         description ?? null,
    closes_at:           closesAt ?? null,
    options:             updatedOptions,
    verification_type:   verificationType   ?? 'manual',
    verification_config: verificationConfig ?? {},
    metadata:            newMeta,
    ...(rake !== undefined ? { rake_pct: rake } : {}),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await admin.from('audit_log').insert({
      entity_type: 'market', action: 'updated',
      entity_id: params.id, actor_id: user.id, actor_type: 'admin',
      metadata: { title: title.trim() },
    })
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify market exists
  const { data: market } = await admin.from('markets').select('id, title, total_pool').eq('id', params.id).single()
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  // Refuse to delete markets with funds in the pool — refund first
  if (Number(market.total_pool) > 0) {
    return NextResponse.json({ error: 'Cannot delete a market with active pool funds. Settle or cancel it first.' }, { status: 409 })
  }

  const { error } = await admin.from('markets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await admin.from('audit_log').insert({
      entity_type: 'market', action: 'deleted',
      entity_id: params.id, actor_id: user.id, actor_type: 'admin',
      metadata: { title: market.title },
    })
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true })
}
