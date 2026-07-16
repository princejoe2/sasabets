import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { verifyTotpCookie, COOKIE_NAME } from '@/lib/totp-session'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { getMarzBalance } from '@/lib/marz'

export const metadata = { title: 'Sabula 256 Control Panel' }

const TOTP_EXEMPT = ['/admin/setup-2fa', '/admin/verify-2fa']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const pathname = (await headers()).get('x-pathname') ?? ''

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, marzBalance] = await Promise.all([
    admin.from('profiles').select('is_admin, staff_role, phone, totp_secret, totp_enabled, admin_session_id').eq('id', user.id).single(),
    getMarzBalance().catch(() => ({ available: 0, currency: 'UGX' })),
  ])

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

  return (
    <div className="flex min-h-screen bg-[#08080e]">
      <AdminSidebar
        adminPhone={profile.phone}
        floatBalance={marzBalance.available}
        isSuperAdmin={!!profile.is_admin}
        staffRole={profile.staff_role ?? null}
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
