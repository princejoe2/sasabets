import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

// PATCH /api/admin/staff-roles/update — update name and/or email for a staff member
// body: { userId, fullName?, email? }
export async function PATCH(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const userId: string   = (body.userId   ?? '').trim()
  const fullName: string = (body.fullName ?? '').trim()
  const email: string    = (body.email    ?? '').trim().toLowerCase()

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: target } = await g.admin.from('profiles').select('is_admin').eq('id', userId).single()
  if (target?.is_admin)
    return NextResponse.json({ error: 'Cannot modify a super-admin account here' }, { status: 400 })

  if (fullName) {
    const { error } = await g.admin.from('profiles').update({ full_name: fullName }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    if (!email.endsWith('@sabula256.com'))
      return NextResponse.json({ error: 'Staff email must end in @sabula256.com' }, { status: 400 })
    const { error } = await g.admin.auth.admin.updateUserById(userId, { email })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
