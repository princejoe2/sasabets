'use client'
import { useState } from 'react'

interface Withdrawal {
  id: string; amount: number; status: string; created_at: string;
  profiles: { phone: string; full_name: string | null } | null;
  metadata: { phone?: string } | null
}

export default function AdminWithdrawalsClient({ withdrawals }: { withdrawals: Withdrawal[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  function status(w: Withdrawal) { return statuses[w.id] ?? w.status }

  async function act(id: string, action: 'complete' | 'reject') {
    setLoading(id)
    const res = await fetch('/api/admin/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, action }),
    })
    if (res.ok) {
      setStatuses(s => ({ ...s, [id]: action === 'complete' ? 'completed' : 'failed' }))
      setConfirm(null)
    }
    setLoading(null)
  }

  const pending  = withdrawals.filter(w => status(w) === 'pending')
  const resolved = withdrawals.filter(w => status(w) !== 'pending')

  return (
    <div className="space-y-8">
      {/* Pending */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-16 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-bold text-slate-400">No pending withdrawals</p>
          <p className="text-sm text-slate-600 mt-1">All requests have been processed.</p>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-amber-500">
            Pending ({pending.length}) — Action Required
          </h2>
          <div className="space-y-3">
            {pending.map(w => (
              <div key={w.id} className="rounded-2xl border border-amber-800/30 bg-[#0d0d18] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-200">+{w.profiles?.phone ?? '—'}</p>
                    {w.profiles?.full_name && <p className="text-sm text-slate-500">{w.profiles.full_name}</p>}
                    <p className="mt-1 text-sm text-slate-500">
                      Send to: <span className="font-mono text-slate-300">{w.metadata?.phone ?? 'same number'}</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(w.created_at).toLocaleString('en-UG', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-amber-400">UGX {Math.abs(w.amount).toLocaleString()}</p>
                    {confirm === w.id ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => act(w.id, 'complete')}
                          disabled={loading === w.id}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          {loading === w.id ? '…' : '✓ Mark Sent'}
                        </button>
                        <button
                          onClick={() => act(w.id, 'reject')}
                          disabled={loading === w.id}
                          className="rounded-xl border border-red-700/50 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        >
                          ✕ Reject
                        </button>
                        <button onClick={() => setConfirm(null)} className="text-xs text-slate-600 px-2">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirm(w.id)}
                        className="mt-3 rounded-xl border border-[#1a1a28] px-4 py-2 text-sm font-bold text-slate-400 hover:border-amber-700/50 hover:text-amber-400 transition-colors"
                      >
                        Process →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {resolved.length > 0 && (
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-600">History</h2>
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            {resolved.map((w, i) => (
              <div key={w.id} className={`flex items-center justify-between px-5 py-4 hover:bg-[#111120] transition-colors ${i < resolved.length-1 ? 'border-b border-[#1a1a28]' : ''}`}>
                <div>
                  <p className="text-sm font-mono text-slate-300">+{w.profiles?.phone ?? '—'}</p>
                  <p className="text-xs text-slate-600">{w.metadata?.phone ?? '—'} · {new Date(w.created_at).toLocaleDateString('en-UG', {day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-300">UGX {Math.abs(w.amount).toLocaleString()}</p>
                  <p className={`text-xs ${status(w) === 'completed' ? 'text-emerald-500' : 'text-red-500'}`}>{status(w)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
