import { createAdminClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import AdminActivityClient, { type ActivityProps } from '@/components/admin/AdminActivityClient'

export default async function AdminActivityPage() {
  const admin = createAdminClient()

  const [
    { data: deposits },
    { data: withdrawals },
    { data: settledMarkets },
    { data: bets },
  ] = await Promise.all([
    admin.from('transactions')
      .select('id, amount, status, created_at, reference, pesapal_tracking_id, metadata, profiles(phone, full_name)')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(300),

    admin.from('transactions')
      .select('id, amount, status, created_at, metadata, profiles(phone, full_name)')
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })
      .limit(300),

    admin.from('markets')
      .select('id, title, options, total_pool, rake_pct, winning_option_id, settled_at, created_at')
      .eq('status', 'settled')
      .order('settled_at', { ascending: false })
      .limit(200),

    admin.from('bets')
      .select('id, amount, potential_payout, settled_payout, status, placed_at, option_id, profiles(phone), markets(title, options)')
      .order('placed_at', { ascending: false })
      .limit(500),
  ])

  const props = {
    deposits:       (deposits       ?? []) as unknown as ActivityProps['deposits'],
    withdrawals:    (withdrawals    ?? []) as unknown as ActivityProps['withdrawals'],
    settledMarkets: (settledMarkets ?? []) as unknown as ActivityProps['settledMarkets'],
    bets:           (bets           ?? []) as unknown as ActivityProps['bets'],
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Activity</h1>
        <p className="mt-1 text-slate-500">Classified view of all platform transactions and events</p>
      </div>
      <AdminActivityClient {...props} />
    </div>
  )
}
