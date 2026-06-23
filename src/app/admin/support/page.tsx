import { createAdminClient } from '@/lib/supabase/server'
import ComplaintsClient from './ComplaintsClient'

export default async function AdminSupportPage() {
  const admin = createAdminClient()

  const [{ data: profiles }, { data: wallets }, { data: bets }, { data: transactions }] = await Promise.all([
    admin.from('profiles').select('id, phone, full_name, created_at').order('created_at', { ascending: false }),
    admin.from('wallets').select('user_id, balance'),
    admin.from('bets').select('user_id, status, amount'),
    admin.from('transactions').select('user_id, type, status, created_at').order('created_at', { ascending: false }).limit(200),
  ])

  const walletMap = Object.fromEntries((wallets ?? []).map(w => [w.user_id, Number(w.balance)]))

  // Flag users with potential issues
  const flagged = (profiles ?? []).map(p => {
    const userBets = (bets ?? []).filter(b => b.user_id === p.id)
    const userTxns = (transactions ?? []).filter(t => t.user_id === p.id)
    const failedTxns = userTxns.filter(t => t.status === 'failed')
    const pendingWithdrawals = userTxns.filter(t => t.type === 'withdrawal' && t.status === 'pending')
    const activeBets = userBets.filter(b => b.status === 'active')
    const balance = walletMap[p.id] ?? 0

    const flags: string[] = []
    if (failedTxns.length > 0) flags.push(`${failedTxns.length} failed txn${failedTxns.length > 1 ? 's' : ''}`)
    if (pendingWithdrawals.length > 0) flags.push(`${pendingWithdrawals.length} pending withdrawal${pendingWithdrawals.length > 1 ? 's' : ''}`)
    if (activeBets.length > 5) flags.push(`${activeBets.length} active bets`)

    return { ...p, balance, flags, txnCount: userTxns.length, betCount: userBets.length }
  }).filter(p => p.flags.length > 0).slice(0, 30)

  // All users for lookup
  const allUsers = (profiles ?? []).map(p => ({
    ...p,
    balance: walletMap[p.id] ?? 0,
    betCount: (bets ?? []).filter(b => b.user_id === p.id).length,
    txnCount: (transactions ?? []).filter(t => t.user_id === p.id).length,
  })).slice(0, 50)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Support</h1>
        <p className="mt-1 text-slate-500">Users needing attention and client directory</p>
      </div>

      <ComplaintsClient />

      {/* Flagged users */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-black text-slate-200">Flagged Accounts</h2>
          {flagged.length > 0 && (
            <span className="rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">{flagged.length}</span>
          )}
        </div>

        {flagged.length === 0 ? (
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-12 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="font-bold text-slate-400">All clear</p>
            <p className="text-sm text-slate-600 mt-1">No accounts require attention right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flagged.map(user => (
              <div key={user.id} className="rounded-2xl border border-amber-800/30 bg-[#0d0d18] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-200">+{user.phone}</p>
                    {user.full_name && <p className="text-sm text-slate-500">{user.full_name}</p>}
                    <p className="text-xs text-slate-600 mt-1">
                      Joined {new Date(user.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      · {user.betCount} bets · {user.txnCount} transactions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.flags.map(f => (
                        <span key={f} className="rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${user.balance > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      UGX {user.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-600">balance</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All users table */}
      <div>
        <h2 className="mb-4 font-black text-slate-200">Client Directory</h2>
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <span>#</span>
            <span>Phone</span>
            <span className="text-right">Balance</span>
            <span className="text-right">Bets</span>
            <span className="text-right">Joined</span>
          </div>
          {allUsers.map((u, i) => (
            <div key={u.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 border-b border-[#1a1a28] last:border-0 hover:bg-[#111120] transition-colors">
              <span className="text-xs text-slate-600 w-6 text-right">{i + 1}</span>
              <div>
                <p className="text-sm font-mono text-slate-200">+{u.phone}</p>
                {u.full_name && <p className="text-xs text-slate-500">{u.full_name}</p>}
              </div>
              <span className={`text-sm font-bold text-right ${u.balance > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                UGX {u.balance.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 text-right">{u.betCount}</span>
              <span className="text-xs text-slate-600 text-right">
                {new Date(u.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
