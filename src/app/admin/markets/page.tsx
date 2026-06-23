import { createAdminClient } from '@/lib/supabase/server'
import AdminMarketsClient from '@/components/admin/AdminMarketsClient'

export const revalidate = 0

export default async function AdminMarketsPage() {
  const admin = createAdminClient()
  const { data: markets } = await admin
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Markets</h1>
        <p className="mt-1 text-slate-500">Create, manage, and settle prediction markets</p>
      </div>
      <AdminMarketsClient markets={markets ?? []} />
    </div>
  )
}
