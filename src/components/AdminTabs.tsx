'use client'
import { useState } from 'react'
import CreateMarketForm from './CreateMarketForm'
import SettleMarketForm from './SettleMarketForm'

interface Market {
  id: string; title: string; status: string; total_pool: number;
  options: Array<{ id: string; label: string; total_pool: number }>;
  closes_at: string | null; created_at: string
}
interface Bet {
  id: string; option_id: string; amount: number; status: string; placed_at: string;
  profiles: { phone: string; full_name: string | null } | null; market_id: string
}
interface UserProfile { id: string; phone: string; full_name: string | null; is_admin: boolean; created_at: string }
interface Transaction {
  id: string; type: string; amount: number; status: string; created_at: string;
  profiles: { phone: string; full_name: string | null } | null; pesapal_tracking_id: string | null;
  metadata: { phone?: string } | null
}

const TABS = ['Overview', 'Markets', 'Bets', 'Users', 'Transactions', 'Withdrawals'] as const

export default function AdminTabs({
  markets, bets, users, transactions,
}: {
  markets: Market[]
  bets: Bet[]
  users: UserProfile[]
  transactions: Transaction[]
}) {
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')
  const [showCreate, setShowCreate] = useState(false)
  const [settleMarket, setSettleMarket] = useState<Market | null>(null)

  const totalPool = markets.reduce((s, m) => s + Number(m.total_pool), 0)
  const totalDeposited = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Users', value: users.length },
            { label: 'Open Markets', value: markets.filter(m => m.status === 'open').length },
            { label: 'Total Pool (UGX)', value: totalPool.toLocaleString() },
            { label: 'Total Deposited (UGX)', value: totalDeposited.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6">
              <p className="text-2xl font-bold text-violet-400">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Markets */}
      {tab === 'Markets' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-slate-500">{markets.length} markets</p>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-700 transition-colors"
            >
              {showCreate ? 'Cancel' : '+ New Market'}
            </button>
          </div>
          {showCreate && (
            <div className="mb-6">
              <CreateMarketForm onCreated={() => setShowCreate(false)} />
            </div>
          )}
          {settleMarket && (
            <div className="mb-6">
              <SettleMarketForm market={settleMarket} onDone={() => setSettleMarket(null)} />
            </div>
          )}
          <div className="divide-y divide-[#1e1e2e] rounded-xl border border-[#1e1e2e] bg-[#13131a]">
            {markets.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    Pool: UGX {Number(m.total_pool).toLocaleString()} ·{' '}
                    {m.options.length} options · {m.status}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {m.status === 'open' && (
                    <button
                      onClick={() => setSettleMarket(m)}
                      className="rounded-lg border border-violet-700 px-3 py-1.5 text-xs hover:bg-violet-900/30 transition-colors"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bets */}
      {tab === 'Bets' && (
        <div className="divide-y divide-[#1e1e2e] rounded-xl border border-[#1e1e2e] bg-[#13131a]">
          {bets.map(b => (
            <div key={b.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm">{b.profiles?.full_name ?? b.profiles?.phone ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">
                  Option: {b.option_id} · {new Date(b.placed_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">UGX {Number(b.amount).toLocaleString()}</p>
                <p className={`text-xs ${
                  b.status === 'won' ? 'text-emerald-400'
                  : b.status === 'lost' ? 'text-red-400'
                  : 'text-slate-500'
                }`}>{b.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'Users' && (
        <div className="divide-y divide-[#1e1e2e] rounded-xl border border-[#1e1e2e] bg-[#13131a]">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm">{u.full_name ?? u.phone}</p>
                <p className="text-xs text-slate-500">{u.phone}</p>
                <p className="text-xs text-slate-500">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              {u.is_admin && (
                <span className="rounded-full bg-violet-900/40 px-2 py-0.5 text-xs text-violet-400">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      {tab === 'Transactions' && (
        <div className="divide-y divide-[#1e1e2e] rounded-xl border border-[#1e1e2e] bg-[#13131a]">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm">{t.profiles?.full_name ?? t.profiles?.phone ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">
                  {t.type} · {new Date(t.created_at).toLocaleDateString()}
                  {t.pesapal_tracking_id && ` · ${t.pesapal_tracking_id}`}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}UGX {Math.abs(t.amount).toLocaleString()}
                </p>
                <p className={`text-xs ${
                  t.status === 'completed' ? 'text-emerald-500'
                  : t.status === 'failed' ? 'text-red-500'
                  : 'text-yellow-500'
                }`}>{t.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawals */}
      {tab === 'Withdrawals' && <WithdrawalsTab withdrawals={transactions.filter(t => t.type === 'withdrawal')} />}
    </div>
  )
}

function WithdrawalsTab({ withdrawals }: { withdrawals: Transaction[] }) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({})

  async function act(id: string, action: 'complete' | 'reject') {
    setLoading(id)
    const res = await fetch('/api/admin/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, action }),
    })
    if (res.ok) {
      setLocalStatus(s => ({ ...s, [id]: action === 'complete' ? 'completed' : 'failed' }))
      setActionId(null)
    }
    setLoading(null)
  }

  const pending = withdrawals.filter(w => (localStatus[w.id] ?? w.status) === 'pending')
  const done = withdrawals.filter(w => (localStatus[w.id] ?? w.status) !== 'pending')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-yellow-400">Pending ({pending.length})</p>
          <div className="divide-y divide-[#1e1e2e] rounded-xl border border-yellow-800/40 bg-[#13131a]">
            {pending.map(w => (
              <div key={w.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{w.profiles?.full_name ?? w.profiles?.phone ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">
                      Send to: <span className="text-slate-300 font-mono">{w.metadata?.phone ?? '—'}</span>
                    </p>
                    <p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-400">UGX {Math.abs(w.amount).toLocaleString()}</p>
                    {actionId === w.id ? (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => act(w.id, 'complete')}
                          disabled={loading === w.id}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          {loading === w.id ? '…' : 'Mark sent'}
                        </button>
                        <button
                          onClick={() => act(w.id, 'reject')}
                          disabled={loading === w.id}
                          className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                        <button onClick={() => setActionId(null)} className="text-xs text-slate-500">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActionId(w.id)}
                        className="mt-2 rounded-lg border border-[#1e1e2e] px-3 py-1.5 text-xs text-slate-400 hover:border-violet-700 hover:text-white transition-colors"
                      >
                        Process
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-10 text-center text-sm text-slate-500">
          No pending withdrawals.
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">History</p>
          <div className="divide-y divide-[#1e1e2e] rounded-xl border border-[#1e1e2e] bg-[#13131a]">
            {done.map(w => {
              const status = localStatus[w.id] ?? w.status
              return (
                <div key={w.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm">{w.profiles?.full_name ?? w.profiles?.phone ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{w.metadata?.phone ?? '—'} · {new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-300">UGX {Math.abs(w.amount).toLocaleString()}</p>
                    <p className={`text-xs ${status === 'completed' ? 'text-emerald-500' : 'text-red-500'}`}>{status}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
