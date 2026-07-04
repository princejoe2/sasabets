import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? admin : null
}

// PATCH — edit details, suspend, unsuspend
export async function PATCH(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, full_name, phone, suspended, suspend_reason, verified_creator } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (full_name         !== undefined) updates.full_name         = full_name
  if (phone             !== undefined) updates.phone             = phone.replace(/\D/g, '')
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

// DELETE — permanently delete user account
export async function DELETE(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  // Delete auth user (cascades to profiles via DB trigger)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('[admin/user] delete failed:', error.message)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
