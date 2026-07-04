import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('markets')
    .update({ surge_flag: false })
    .eq('id', (await params).id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('market_events').insert({
    market_id: (await params).id,
    event_type: 'surge_cleared',
    actor_type: 'admin',
    actor_id: user.id,
  })

  await admin.from('audit_log').insert({
    entity_type: 'market', action: 'surge_cleared',
    entity_id: (await params).id, actor_id: user.id, actor_type: 'admin',
  })

  return NextResponse.json({ ok: true })
}
