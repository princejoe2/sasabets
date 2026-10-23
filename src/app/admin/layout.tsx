import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { verifyTotpCookie, COOKIE_NAME } from '@/lib/totp-session'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { getMarzBalance } from '@/lib/marz'
import { ROLE_ALLOWED_PATHS } from '@/lib/admin-roles'
import type { StaffRole } from '@/lib/admin-roles'

export const metadata = { title: 'Sabula 256 Control Panel' }

const TOTP_EXEMPT = ['/admin/setup-2fa', '/admin/verify-2fa']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const pathname = (await headers()).get('x-pathname') ?? ''

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Try selecting staff_permissions; fall back gracefully if the column doesn't exist yet
  type ProfileRow = {
    is_admin: boolean | null
    staff_role: string | null
    staff_permissions: string[] | null
    phone: string
    totp_secret: string | null
    totp_enabled: boolean | null
    admin_session_id: string | null
  }

  let profileData: ProfileRow | null = null
  const profileQuery = await admin.from('profiles')
    .select('is_admin, staff_role, staff_permissions, phone, totp_secret, totp_enabled, admin_session_id')
    .eq('id', user.id).single()

  if (profileQuery.error) {
    const fallback = await admin.from('profiles')
      .select('is_admin, staff_role, phone, totp_secret, totp_enabled, admin_session_id')
      .eq('id', user.id).single()
    profileData = fallback.data ? { ...fallback.data, staff_permissions: null } as ProfileRow : null
  } else {
    profileData = profileQuery.data as ProfileRow
  }

  const profile = profileData
  const marzBalance = await getMarzBalance().catch(() => ({ available: 0, currency: 'UGX' }))

  if (!profile?.is_admin && !profile?.staff_role) redirect('/')

  // On 2FA setup/verify pages: skip TOTP enforcement, render without sidebar
  if (TOTP_EXEMPT.includes(pathname)) {
    return <>{children}</>
  }

  // Enforce TOTP for all other admin pages
  if (!profile.totp_enabled) {
    redirect('/admin/setup-2fa')
  }

  const cookieStore = await cookies()
  const totpCookie = cookieStore.get(COOKIE_NAME)?.value
  const { valid: totpValid, sessionId: currentSessionId } = verifyTotpCookie(totpCookie, user.id)
  if (!totpValid) {
    redirect('/admin/verify-2fa')
  }

  // If the session ID in the cookie no longer matches the DB, another device has
  // logged in and displaced this session. Force re-authentication.
  if (profile.admin_session_id && currentSessionId !== profile.admin_session_id) {
    redirect('/admin/verify-2fa')
  }

  // Enforce page-level access for staff: redirect to dashboard if the current
  // page is outside their permitted paths (custom or role-default).
  if (!profile.is_admin && profile.staff_role && !TOTP_EXEMPT.includes(pathname)) {
    const effectivePaths: string[] = (profile.staff_permissions as string[] | null)
      ?? ROLE_ALLOWED_PATHS[profile.staff_role as StaffRole]
      ?? []
    const allowed = new Set(['/admin', ...effectivePaths])
    const pageAllowed =
      pathname === '/admin' ||
      [...allowed].some(p => p !== '/admin' && pathname.startsWith(p))
    if (!pageAllowed) redirect('/admin')
  }

  const staffPermissions = (profile.staff_permissions as string[] | null) ?? null

  return (
    <div className="flex min-h-screen bg-[#08080e]">
      <AdminSidebar
        adminPhone={profile.phone}
        floatBalance={marzBalance.available}
        isSuperAdmin={!!profile.is_admin}
        staffRole={profile.staff_role ?? null}
        staffPermissions={staffPermissions}
        userId={user.id}
        currentSessionId={currentSessionId}
      />
      {/* md:ml-60 leaves room for the fixed sidebar on tablet+.
          pt-[72px] clears the mobile top bar (hidden on md+). */}
      <div className="flex-1 min-w-0 md:ml-60">
        <main className="min-h-screen p-4 pt-[72px] md:p-6 md:pt-6 lg:p-8 lg:pt-8">{children}</main>
      </div>
    </div>
  )
}
