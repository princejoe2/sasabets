'use client'
import { useState } from 'react'

interface User {
  id: string
  phone: string | null
  full_name: string | null
  is_admin: boolean
  suspended: boolean
  suspend_reason: string | null
  kyc_status: string | null
  verified_creator: boolean
  created_at: string
  balance: number
  bets: number
  wagered: number
  won: number
}

export default function AdminUsersClient({ users: initial, totalBalance }: { users: User[]; totalBalance: number }) {
  const [users,    setUsers]    = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone,setEditPhone]= useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    !search ||
    u.phone?.includes(search) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  function csvCell(value: string | number): string {
    const s = String(value ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  function downloadCsv() {
    const header = ['Name', 'Phone', 'Balance (UGX)', 'Bets Placed', 'Total Wagered (UGX)', 'KYC Status', 'Joined Date']
    const lines = users.map(u => [
      u.full_name ?? '',
      u.phone ? `+${u.phone}` : '',
      u.balance,
      u.bets,
      u.wagered,
      u.kyc_status ?? 'none',
      new Date(u.created_at).toISOString().slice(0, 10),
    ].map(csvCell).join(','))

    const csv = [header.map(csvCell).join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  async function patch(userId: string, payload: object) {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...payload }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ text: 'Updated.', ok: true })
      return true
    } else {
      setMsg({ text: data.error ?? 'Failed', ok: false })
      return false
    }
    setBusy(false)
  }

  async function saveEdit(userId: string) {
    const ok = await patch(userId, { full_name: editName, phone: editPhone })
    if (ok) {
      setUsers(u => u.map(x => x.id === userId ? { ...x, full_name: editName, phone: editPhone.replace(/\D/g,'') } : x))
      setEditing(null)
    }
    setBusy(false)
  }

  async function toggleSuspend(user: User) {
    if (!user.suspended && !suspendReason.trim()) {
      setMsg({ text: 'Enter a reason for suspension.', ok: false }); return
    }
    const ok = await patch(user.id, {
      suspended: !user.suspended,
      suspend_reason: user.suspended ? null : suspendReason.trim(),
    })
    if (ok) {
      setUsers(u => u.map(x => x.id === user.id
        ? { ...x, suspended: !user.suspended, suspend_reason: user.suspended ? null : suspendReason }
        : x))
      setSuspendReason('')
    }
    setBusy(false)
  }

  async function deleteUser(userId: string) {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(u => u.filter(x => x.id !== userId))
      setExpanded(null); setConfirmDelete(null)
      setMsg({ text: 'User deleted.', ok: true })
    } else {
      setMsg({ text: data.error ?? 'Delete failed', ok: false })
    }
    setBusy(false)
  }

  const KYC_STYLE: Record<string, string> = {
    approved: 'text-emerald-400',
    pending:  'text-amber-400',
    rejected: 'text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Users</h1>
          <p className="mt-1 text-slate-500">{users.length} registered · UGX {totalBalance.toLocaleString()} total in wallets</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone or name…"
            className="rounded-xl border border-[#1a1a28] bg-[#0d0d18] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors w-64"
          />
          <button
            onClick={downloadCsv}
            className="rounded-xl border border-[#2a2a3e] bg-[#0d0d18] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-violet-700 hover:text-white transition-colors whitespace-nowrap"
          >
            ⬇ Download CSV
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <span>#</span><span>User</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Bets</span>
          <span className="text-right">Wagered</span>
          <span className="text-right">Joined</span>
        </div>

        {filtered.map((u, i) => (
          <div key={u.id}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === u.id ? null : u.id)}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-[#1a1a28] cursor-pointer transition-colors ${
                expanded === u.id ? 'bg-[#111120]' : 'hover:bg-[#0f0f1a]'
              }`}
            >
              <span className="text-xs text-slate-600 w-6 text-right">{i + 1}</span>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-slate-200">+{u.phone}</span>
                  {u.is_admin && <span className="rounded-full bg-red-900/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400">Admin</span>}
                  {u.suspended && <span className="rounded-full bg-orange-900/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-400">Suspended</span>}
                  {u.kyc_status === 'approved' && <span className="rounded-full bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-500">KYC ✓</span>}
                  {u.verified_creator && <span className="rounded-full bg-violet-900/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-violet-400">✓ Verified</span>}
                </div>
                {u.full_name && <p className="text-xs text-slate-500">{u.full_name}</p>}
              </div>

              <span className={`text-sm font-bold text-right ${u.balance > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                UGX {u.balance.toLocaleString()}
              </span>
              <div className="text-right">
                <span className="text-sm text-slate-300">{u.bets}</span>
                {u.bets > 0 && <p className="text-[10px] text-slate-600">{u.won}W</p>}
              </div>
              <span className="text-sm text-slate-400 text-right">UGX {u.wagered.toLocaleString()}</span>
              <span className="text-xs text-slate-600 text-right">
                {new Date(u.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
            </div>

            {/* Expanded panel */}
            {expanded === u.id && (
              <div className="border-b border-[#1a1a28] bg-[#0a0a12] px-6 py-5 space-y-5">

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Wallet', value: `UGX ${u.balance.toLocaleString()}` },
                    { label: 'Bets placed', value: u.bets },
                    { label: 'Total wagered', value: `UGX ${u.wagered.toLocaleString()}` },
                    { label: 'KYC', value: u.kyc_status ?? 'none', cls: KYC_STYLE[u.kyc_status ?? ''] ?? 'text-slate-500' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-[#0d0d18] border border-[#1a1a28] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">{s.label}</p>
                      <p className={`mt-1 text-sm font-bold ${s.cls ?? 'text-white'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Edit details */}
                {editing === u.id ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Edit details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-600 uppercase tracking-wider">Full name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#2a2a3e] bg-[#0d0d18] px-3 py-2 text-sm text-white outline-none focus:border-violet-600" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 uppercase tracking-wider">Phone</label>
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#2a2a3e] bg-[#0d0d18] px-3 py-2 text-sm text-white outline-none focus:border-violet-600 font-mono" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(u.id)} disabled={busy}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
                        Save
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="rounded-xl border border-[#2a2a3e] px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {/* Edit */}
                    <button onClick={() => { setEditing(u.id); setEditName(u.full_name ?? ''); setEditPhone(u.phone ?? ''); setMsg(null) }}
                      className="rounded-xl border border-[#2a2a3e] px-4 py-2 text-xs font-bold text-slate-300 hover:border-violet-700 hover:text-white transition-colors">
                      ✏️ Edit Details
                    </button>

                    {/* Suspend / Unsuspend */}
                    {u.suspended ? (
                      <button onClick={() => toggleSuspend(u)} disabled={busy}
                        className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        ✓ Unsuspend
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                          placeholder="Suspension reason…"
                          className="rounded-xl border border-[#2a2a3e] bg-[#0d0d18] px-3 py-2 text-xs text-white outline-none focus:border-orange-600 w-48" />
                        <button onClick={() => toggleSuspend(u)} disabled={busy}
                          className="rounded-xl bg-orange-700 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
                          ⏸ Suspend
                        </button>
                      </div>
                    )}

                    {/* Verified Creator */}
                    {!u.is_admin && (
                      <button
                        onClick={async () => {
                          const ok = await patch(u.id, { verified_creator: !u.verified_creator })
                          if (ok) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, verified_creator: !u.verified_creator } : x))
                          setBusy(false)
                        }}
                        disabled={busy}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                          u.verified_creator
                            ? 'border border-violet-700/40 text-violet-400 hover:bg-violet-900/20'
                            : 'border border-[#2a2a3e] text-slate-400 hover:border-violet-700 hover:text-violet-300'
                        }`}
                      >
                        {u.verified_creator ? '✓ Verified Creator' : '✓ Grant Verified'}
                      </button>
                    )}

                    {/* Delete */}
                    {confirmDelete === u.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-red-400 font-bold">Delete permanently?</span>
                        <button onClick={() => deleteUser(u.id)} disabled={busy}
                          className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                          {busy ? 'Deleting…' : 'Confirm Delete'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="rounded-xl border border-[#2a2a3e] px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setConfirmDelete(u.id); setMsg(null) }} disabled={u.is_admin}
                        title={u.is_admin ? 'Cannot delete admin accounts' : ''}
                        className="rounded-xl border border-red-900/50 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        🗑 Delete Account
                      </button>
                    )}
                  </div>
                )}

                {u.suspended && u.suspend_reason && (
                  <p className="text-xs text-orange-400/70">Suspension reason: {u.suspend_reason}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
