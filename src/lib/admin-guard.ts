import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StaffRole } from '@/lib/admin-roles'

export type { StaffRole } from '@/lib/admin-roles'

export type GuardResult =
  | { error: NextResponse }
  | { user: { id: string }; admin: SupabaseClient; isSuperAdmin: boolean; role: StaffRole | null }

/**
 * Guards an admin API route. Super-admin (is_admin=true) always passes.
 * Staff pass only if their staff_role is in allowedRoles.
 * Calling with no allowedRoles restricts to super-admin only.
 */
export async function guardAdmin(allowedRoles?: StaffRole[]): Promise<GuardResult> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, staff_role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  if (profile.is_admin) {
    return { user, admin, isSuperAdmin: true, role: null }
  }

  if (allowedRoles && profile.staff_role && allowedRoles.includes(profile.staff_role as StaffRole)) {
    return { user, admin, isSuperAdmin: false, role: profile.staff_role as StaffRole }
  }

  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}
