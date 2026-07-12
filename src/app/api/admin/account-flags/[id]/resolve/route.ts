import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same roles as the account-flags list route: moderators and support resolve flags.
  const g = await guardAdmin(['moderator', 'support'])
  if ('error' in g) return g.error
  const { user, admin } = g

  const { error } = await admin
    .from('account_flags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', (await params).id)
    .is('resolved_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_log').insert({
    entity_type: 'flag', action: 'resolved',
    entity_id: (await params).id, actor_id: user.id, actor_type: 'admin',
  })

  return NextResponse.json({ ok: true })
}
