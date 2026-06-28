import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin
    .from('account_flags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', params.id)
    .is('resolved_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    entity_type: 'flag', action: 'resolved',
    entity_id: params.id, actor_id: user.id, actor_type: 'admin',
  })

  return NextResponse.json({ ok: true })
}
