import { createAdminClient } from '@/lib/supabase/server'
import AdminWithdrawalsClient from '@/components/admin/AdminWithdrawalsClient'

export default async function AdminWithdrawalsPage() {
  const admin = createAdminClient()

  const { data: withdrawals } = await admin
    .from('transactions')
    .select('*, profiles(phone, full_name)')
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Withdrawals</h1>
        <p className="mt-1 text-slate-500">
          {withdrawals?.filter(w => w.status === 'pending').length ?? 0} pending ·{' '}
          {withdrawals?.length ?? 0} total
        </p>
      </div>
      <AdminWithdrawalsClient withdrawals={withdrawals ?? []} />
    </div>
  )
}
