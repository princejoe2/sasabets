import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyTotpCookie, COOKIE_NAME } from '@/lib/totp-session'
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
    .select('is_admin, staff_role, totp_enabled, admin_session_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const jar = await cookies()
  const totpCookie = jar.get(COOKIE_NAME)?.value
  const { valid: totpValid, sessionId: cookieSessionId } = verifyTotpCookie(totpCookie, user.id)

  if (profile.is_admin) {
    if (!totpValid) {
      return { error: NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 }) }
    }
    // Reject if the session has been displaced by a login on another device
    if (profile.admin_session_id && cookieSessionId !== profile.admin_session_id) {
      return { error: NextResponse.json({ error: 'Session displaced — please log in again' }, { status: 401 }) }
    }
    return { user, admin, isSuperAdmin: true, role: null }
  }

  if (allowedRoles && profile.staff_role && allowedRoles.includes(profile.staff_role as StaffRole)) {
    // Require TOTP for staff members who have enrolled — a stolen session token alone
    // is not sufficient to settle markets or adjust funds.
    if (profile.totp_enabled) {
      if (!totpValid) {
        return { error: NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 }) }
      }
      if (profile.admin_session_id && cookieSessionId !== profile.admin_session_id) {
        return { error: NextResponse.json({ error: 'Session displaced — please log in again' }, { status: 401 }) }
      }
    }
    return { user, admin, isSuperAdmin: false, role: profile.staff_role as StaffRole }
  }

  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}
