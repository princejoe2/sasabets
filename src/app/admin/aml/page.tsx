'use client'

import { useEffect, useState } from 'react'
import type { AmlFlag } from '@/lib/aml-flags'

const FLAG_TYPE_LABEL: Record<string, string> = {
  large_deposit: 'Large Deposit',
  rapid_deposits: 'Rapid Deposits',
  deposit_withdrawal_no_bet: 'Deposit-Withdrawal No Bet',
  smurfing: 'Smurfing',
}

const FLAG_TYPE_COLOR: Record<string, string> = {
  large_deposit: 'bg-red-900/40 text-red-400',
  rapid_deposits: 'bg-orange-900/40 text-orange-400',
  deposit_withdrawal_no_bet: 'bg-amber-900/40 text-amber-400',
  smurfing: 'bg-violet-900/40 text-violet-400',
}

export default function AdminAmlPage() {
  const [flags, setFlags] = useState<AmlFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadFlags() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/aml')
        if (!res.ok) {
          throw new Error('Failed to load AML flags')
        }
        const data = await res.json()
        setFlags(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('[aml/page] load failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFlags()
  }, [])

  // Summary stats
  const uniqueFlaggedUsers = new Set(flags.map(f => f.user_id))
  const unreviewedFlags = flags.filter(f => f.flagged_at) // All flags start as unreviewed
  const thisWeekFlags = flags.filter(f => {
    const flagDate = new Date(f.flagged_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return flagDate >= weekAgo
  })

  // Filter by search
  const filtered = flags.filter(f =>
    !search ||
    f.phone?.includes(search) ||
    f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.flag_type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">AML Monitoring</h1>
          <p className="mt-1 text-slate-500">Anti-Money Laundering Flag Detection & Review</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by phone, name, or flag type…"
          className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors w-80"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Flagged Users</p>
          <p className="mt-2 text-3xl font-black text-violet-400">{uniqueFlaggedUsers.size}</p>
          <p className="mt-1 text-xs text-slate-600">{flags.length} total flags</p>
        </div>

        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Unreviewed Flags</p>
          <p className="mt-2 text-3xl font-black text-amber-400">{unreviewedFlags.length}</p>
          <p className="mt-1 text-xs text-slate-600">awaiting admin review</p>
        </div>

        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">This Week</p>
          <p className="mt-2 text-3xl font-black text-red-400">{thisWeekFlags.length}</p>
          <p className="mt-1 text-xs text-slate-600">last 7 days</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm font-semibold text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] px-4 py-8 text-center text-slate-500">
          Loading AML flags…
        </div>
      )}

      {/* Flags Table */}
      {!loading && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500 text-sm">
              {flags.length === 0 ? 'No AML flags detected.' : 'No flags match your search.'}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-[#1e1e2e] text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <span>#</span>
                <span>User</span>
                <span>Flag Type</span>
                <span className="text-right">Amount</span>
                <span>Date</span>
                <span>Txns</span>
              </div>

              {/* Rows */}
              {filtered.map((flag, i) => (
                <div key={flag.user_id + flag.flag_type + flag.created_at}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpanded(expanded === flag.user_id + flag.flag_type ? null : flag.user_id + flag.flag_type)}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-[#1e1e2e] cursor-pointer transition-colors ${
                      expanded === flag.user_id + flag.flag_type ? 'bg-[#111120]' : 'hover:bg-[#0f0f1a]'
                    }`}
                  >
                    <span className="text-xs text-slate-600 w-6 text-right">{i + 1}</span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono text-slate-200">
                          {flag.phone ? '+' + flag.phone : 'N/A'}
                        </span>
                      </div>
                      {flag.full_name && (
                        <p className="text-xs text-slate-500">{flag.full_name}</p>
                      )}
                    </div>

                    <div>
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${FLAG_TYPE_COLOR[flag.flag_type]}`}>
                        {FLAG_TYPE_LABEL[flag.flag_type]}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-right text-red-400">
                      UGX {flag.amount.toLocaleString()}
                    </span>

                    <span className="text-xs text-slate-600">
                      {new Date(flag.created_at).toLocaleDateString('en-UG', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </span>

                    <span className="text-xs font-mono text-slate-400 text-right">
                      {flag.transaction_ids.length} txn{flag.transaction_ids.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {expanded === flag.user_id + flag.flag_type && (
                    <div className="border-b border-[#1e1e2e] bg-[#0a0a12] px-6 py-5 space-y-5">
                      {/* Details section */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Flag Details
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-[#0d0d18] border border-[#1e1e2e] px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-600">User ID</p>
                            <p className="mt-1 text-sm font-mono text-slate-300 break-all">{flag.user_id}</p>
                          </div>
                          <div className="rounded-xl bg-[#0d0d18] border border-[#1e1e2e] px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-600">Flag Type</p>
                            <p className="mt-1 text-sm font-bold text-white">{FLAG_TYPE_LABEL[flag.flag_type]}</p>
                          </div>
                          <div className="rounded-xl bg-[#0d0d18] border border-[#1e1e2e] px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-600">Total Amount</p>
                            <p className="mt-1 text-sm font-bold text-red-400">UGX {flag.amount.toLocaleString()}</p>
                          </div>
                          <div className="rounded-xl bg-[#0d0d18] border border-[#1e1e2e] px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-600">Flagged Date</p>
                            <p className="mt-1 text-sm font-mono text-slate-400">
                              {new Date(flag.flagged_at).toLocaleString('en-UG')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Transaction IDs */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Related Transactions ({flag.transaction_ids.length})
                        </p>
                        <div className="bg-[#0d0d18] rounded-xl border border-[#1e1e2e] p-4">
                          <div className="space-y-2">
                            {flag.transaction_ids.map((txnId, idx) => (
                              <div key={txnId} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-4">{idx + 1}.</span>
                                <code className="text-xs font-mono text-slate-400 flex-1 break-all">{txnId}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Placeholder for future actions */}
                      <div className="pt-3 border-t border-[#1e1e2e]">
                        <p className="text-xs text-slate-600">
                          ℹ️ Review and action buttons coming soon
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
