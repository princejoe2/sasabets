import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
  const admin = createAdminClient()

  const [{ data: profiles }, { data: wallets }, { data: betStats }] = await Promise.all([
    admin.from('profiles').select('id, phone, full_name, is_admin, created_at').order('created_at', { ascending: false }),
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

  const totalBalances = (Object.values(walletMap) as number[]).reduce((s, b) => s + b, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Users</h1>
        <p className="mt-1 text-slate-500">{profiles?.length ?? 0} registered users · UGX {totalBalances.toLocaleString()} total in wallets</p>
      </div>

      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <span>#</span>
          <span>Phone</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Bets</span>
          <span className="text-right">Wagered</span>
          <span className="text-right">Joined</span>
        </div>

        {profiles?.map((u, i) => {
          const balance = walletMap[u.id] ?? 0
          const stats = betsByUser[u.id] ?? { count: 0, total: 0, won: 0 }
          return (
            <div
              key={u.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-[#1a1a28] last:border-0 hover:bg-[#111120] transition-colors"
            >
              <span className="text-xs text-slate-600 w-6 text-right">{i + 1}</span>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-200">+{u.phone}</span>
                  {u.is_admin && (
                    <span className="rounded-full bg-red-900/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400">Admin</span>
                  )}
                </div>
                {u.full_name && <p className="text-xs text-slate-500">{u.full_name}</p>}
              </div>

              <div className="text-right">
                <span className={`text-sm font-bold ${balance > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  UGX {balance.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-sm text-slate-300">{stats.count}</span>
                {stats.count > 0 && (
                  <p className="text-[10px] text-slate-600">{stats.won}W</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-sm text-slate-400">UGX {stats.total.toLocaleString()}</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-600">
                  {new Date(u.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
