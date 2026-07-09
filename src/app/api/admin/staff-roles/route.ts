import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

const VALID_ROLES = ['moderator', 'settler', 'support', 'analyst', 'content'] as const

// GET /api/admin/staff-roles — list all staff members with assigned roles
export async function GET() {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await g.admin
    .from('profiles')
    .select('id, phone, full_name, staff_role, created_at')
    .not('staff_role', 'is', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/staff-roles — assign or update a role
// body: { userId, role }
export async function POST(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const userId: string = (body.userId ?? '').trim()
  const role: string   = (body.role   ?? '').trim()

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (!VALID_ROLES.includes(role as never))
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })

  // Prevent assigning a role to another super-admin
  const { data: target } = await g.admin.from('profiles').select('is_admin').eq('id', userId).single()
  if (target?.is_admin)
    return NextResponse.json({ error: 'Cannot assign staff role to an admin account' }, { status: 400 })

  const { error } = await g.admin.from('profiles').update({ staff_role: role }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/staff-roles — revoke a role (body: { userId })
export async function DELETE(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const userId: string = (body.userId ?? '').trim()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await g.admin.from('profiles').update({ staff_role: null }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
