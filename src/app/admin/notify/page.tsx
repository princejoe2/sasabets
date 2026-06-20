import { createAdminClient } from '@/lib/supabase/server'
import AdminNotifyClient from '@/components/admin/AdminNotifyClient'

export default async function AdminNotifyPage() {
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('id, phone, full_name').order('created_at', { ascending: false })

  const users = (profiles ?? []).map(p => ({ id: p.id, phone: p.phone, name: p.full_name }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Notifications</h1>
        <p className="mt-1 text-slate-500">Send SMS alerts and announcements to users</p>
      </div>
      <AdminNotifyClient users={users} />
    </div>
  )
}
