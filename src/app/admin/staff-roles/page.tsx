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

  const { data: staff } = await admin
    .from('profiles')
    .select('id, full_name, staff_role, created_at')
    .not('staff_role', 'is', null)
    .order('created_at', { ascending: false })

  // Fetch emails from auth for display
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email ?? '']))

  const staffWithEmail = (staff ?? []).map(s => ({ ...s, email: emailMap[s.id] ?? '' }))

  return <AdminStaffRolesClient staff={staffWithEmail} />
}
