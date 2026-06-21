import { createAdminClient } from '@/lib/supabase/server'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 0

export default async function AdminUsersPage() {
  const admin = createAdminClient()

  const [{ data: profiles }, { data: wallets }, { data: betStats }] = await Promise.all([
    admin.from('profiles').select('id, phone, full_name, is_admin, suspended, suspend_reason, kyc_status, created_at').order('created_at', { ascending: false }),
    admin.from('wallets').select('user_id, balance'),
    admin.from('bets').select('user_id, amount, status'),
  ])

  const walletMap = Object.fromEntries((wallets ?? []).map(w => [w.user_id, Number(w.balance)]))
  const betsByUser = (betStats ?? []).reduce<Record<string, { count: number; total: number; won: number }>>((acc, b) => {
    if (!acc[b.user_id]) acc[b.user_id] = { count: 0, total: 0, won: 0 }
    acc[b.user_id].count++
    acc[b.user_id].total += Number(b.amount)
    if (b.status === 'won') acc[b.user_id].won++
    return acc
  }, {})

  const users = (profiles ?? []).map(u => ({
    id:             u.id,
    phone:          u.phone,
    full_name:      u.full_name,
    is_admin:       u.is_admin,
    suspended:      u.suspended ?? false,
    suspend_reason: u.suspend_reason ?? null,
    kyc_status:     u.kyc_status ?? null,
    created_at:     u.created_at,
    balance:        walletMap[u.id] ?? 0,
    bets:           betsByUser[u.id]?.count ?? 0,
    wagered:        betsByUser[u.id]?.total ?? 0,
    won:            betsByUser[u.id]?.won ?? 0,
  }))

  const totalBalance = users.reduce((s, u) => s + u.balance, 0)

  return <AdminUsersClient users={users} totalBalance={totalBalance} />
}
