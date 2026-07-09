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

  // Fetch all non-admin users for the assignment dropdown
  const { data: users } = await admin
    .from('profiles')
    .select('id, phone, full_name, staff_role')
    .eq('is_admin', false)
    .order('full_name', { ascending: true })

  return <AdminStaffRolesClient users={users ?? []} />
}
