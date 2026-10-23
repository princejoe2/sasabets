import { createAdminClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminStaffRolesClient from '@/components/admin/AdminStaffRolesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff Roles — Sabula 256' }

export default async function StaffRolesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/admin')

  // Try selecting staff_permissions; fall back gracefully if the column doesn't exist yet
  let staffRows: Array<{ id: string; full_name: string | null; staff_role: string | null; staff_permissions?: string[] | null; created_at: string }> = []

  const withPerms = await admin
    .from('profiles')
    .select('id, full_name, staff_role, staff_permissions, created_at')
    .not('staff_role', 'is', null)
    .order('created_at', { ascending: false })

  if (withPerms.error) {
    // Column likely doesn't exist yet — fall back to query without it
    const fallback = await admin
      .from('profiles')
      .select('id, full_name, staff_role, created_at')
      .not('staff_role', 'is', null)
      .order('created_at', { ascending: false })
    staffRows = (fallback.data ?? []).map(r => ({ ...r, staff_permissions: null }))
  } else {
    staffRows = withPerms.data ?? []
  }

  // Fetch emails from auth for display
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email ?? '']))

  const staffWithEmail = staffRows.map(s => ({
    ...s,
    email: emailMap[s.id] ?? '',
    staff_permissions: (s.staff_permissions as string[] | null) ?? null,
  }))

  return <AdminStaffRolesClient staff={staffWithEmail} />
}
