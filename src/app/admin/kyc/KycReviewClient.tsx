'use client'
import { useState } from 'react'

type Submission = {
  id: string
  full_name: string | null
  phone: string | null
  kyc_status: string
  kyc_id_type: string | null
  kyc_id_number: string | null
  updated_at: string | null
}

const ID_TYPE_LABEL: Record<string, string> = {
  national_id:     'National ID',
  passport:        'Passport',
  drivers_license: "Driver's Licence",
  refugee_id:      'Refugee ID',
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-900/20 border-amber-800/40 text-amber-400',
  approved: 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400',
  rejected: 'bg-red-900/20 border-red-800/40 text-red-400',
}

export default function KycReviewClient({ submissions }: { submissions: Submission[] }) {
  const [list,   setList]   = useState(submissions)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [busy,   setBusy]   = useState<string | null>(null)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  const filtered = filter === 'all' ? list : list.filter(s => s.kyc_status === filter)

  async function decide(userId: string, status: 'approved' | 'rejected') {
    setBusy(userId); setMsg(null)
    const res = await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    })
    if (res.ok) {
      setList(l => l.map(s => s.id === userId ? { ...s, kyc_status: status } : s))
      setMsg({ text: `User ${status}.`, ok: true })
    } else {
      setMsg({ text: 'Failed to update.', ok: false })
    }
    setBusy(null)
  }

  const counts = {
    pending:  list.filter(s => s.kyc_status === 'pending').length,
    approved: list.filter(s => s.kyc_status === 'approved').length,
    rejected: list.filter(s => s.kyc_status === 'rejected').length,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">KYC Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Review identity submissions and approve or reject.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all capitalize ${filter === f ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#1e1e2e] text-slate-500 hover:text-white'}`}>
            {f}
            {f !== 'all' && <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-10 text-center text-slate-500">
          No {filter === 'all' ? '' : filter} submissions.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="font-bold text-white">{s.full_name ?? '(no name)'}</p>
                <p className="text-xs text-slate-500">{s.phone ?? '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">{ID_TYPE_LABEL[s.kyc_id_type ?? ''] ?? s.kyc_id_type}</span>
                  <span className="text-slate-700">·</span>
                  <span className="font-mono text-xs text-slate-400">{s.kyc_id_number}</span>
                </div>
                {s.updated_at && (
                  <p className="text-[11px] text-slate-700">
                    {new Date(s.updated_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLE[s.kyc_status] ?? ''}`}>
                  {s.kyc_status}
                </span>
                {s.kyc_status === 'pending' && (
                  <>
                    <button onClick={() => decide(s.id, 'approved')} disabled={busy === s.id}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                      Approve
                    </button>
                    <button onClick={() => decide(s.id, 'rejected')} disabled={busy === s.id}
                      className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
