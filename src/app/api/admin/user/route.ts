import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

// PATCH — edit details, suspend, unsuspend
export async function PATCH(req: NextRequest) {
  const g = await guardAdmin(['support'])
  if ('error' in g) return g.error
  const { admin } = g

  const { userId, full_name, phone, suspended, suspend_reason, verified_creator } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (full_name         !== undefined) updates.full_name         = full_name
  if (phone             !== undefined) {
    const normalized = phone.replace(/[\s\-()]/g, '').replace(/^0/, '256').replace(/^\+/, '')
    if (!/^256(70|71|74|75|76|77|78|39)\d{7}$/.test(normalized)) {
      return NextResponse.json({ error: 'Invalid Uganda phone number' }, { status: 400 })
    }
    updates.phone = normalized
  }
  if (suspended         !== undefined) updates.suspended         = suspended
  if (suspend_reason    !== undefined) updates.suspend_reason    = suspend_reason
  if (verified_creator  !== undefined) updates.verified_creator  = verified_creator

  const { error } = await admin.from('profiles').update(updates).eq('id', userId)
  if (error) {
    console.error('[admin/user] update failed:', error.message)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE — permanently delete user account (super-admin only)
export async function DELETE(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { admin } = g

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('[admin/user] delete failed:', error.message)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
