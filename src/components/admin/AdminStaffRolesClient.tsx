'use client'
import { useState } from 'react'

type UserRow = { id: string; phone: string | null; full_name: string | null; staff_role: string | null }

const ROLES = [
  {
    value: 'moderator',
    label: 'Moderator',
    color: 'text-purple-400 border-purple-800/40 bg-purple-900/20',
    dot: 'bg-purple-500',
    pages: ['Markets', 'Settle Queue', 'Auto-Create', 'Active Bets', 'Banned IPs', 'Account Flags', 'Market Disputes', 'Market Events', 'Up/Down', 'Proposals'],
  },
  {
    value: 'settler',
    label: 'Settler',
    color: 'text-amber-400 border-amber-800/40 bg-amber-900/20',
    dot: 'bg-amber-500',
    pages: ['Settle Queue', 'Markets (view only)'],
  },
  {
    value: 'support',
    label: 'Support',
    color: 'text-sky-400 border-sky-800/40 bg-sky-900/20',
    dot: 'bg-sky-500',
    pages: ['Users', 'KYC Reviews', 'Support', 'Notifications', 'Activity', 'Transactions', 'AML Monitoring'],
  },
  {
    value: 'analyst',
    label: 'Analyst',
    color: 'text-emerald-400 border-emerald-800/40 bg-emerald-900/20',
    dot: 'bg-emerald-500',
    pages: ['Analytics', 'Activity', 'Transactions', 'Funds & Rake'],
  },
  {
    value: 'content',
    label: 'Content Manager',
    color: 'text-rose-400 border-rose-800/40 bg-rose-900/20',
    dot: 'bg-rose-500',
    pages: ['News Posts'],
  },
]

function RoleBadge({ role, className = '' }: { role: string; className?: string }) {
  const r = ROLES.find(x => x.value === role)
  if (!r) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${r.color} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  )
}

export default function AdminStaffRolesClient({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState<UserRow[]>(users)
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const staffMembers = rows.filter(u => u.staff_role)
  const filtered = rows.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q)
    )
  })

  async function assign(userId: string, role: string) {
    setSaving(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/staff-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
      setRows(prev => prev.map(u => u.id === userId ? { ...u, staff_role: role } : u))
      setAssigning(null)
    } finally { setSaving(null) }
  }

  async function revoke(userId: string) {
    setSaving(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/staff-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
      setRows(prev => prev.map(u => u.id === userId ? { ...u, staff_role: null } : u))
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Staff Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign roles to staff members. Each role restricts access to specific sections of the admin panel.
          Only the super admin can manage roles.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Role Reference */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">Role Permissions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className={`rounded-xl border p-4 ${r.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full ${r.dot}`} />
                <span className="font-black text-sm">{r.label}</span>
              </div>
              <ul className="space-y-0.5">
                {r.pages.map(p => (
                  <li key={p} className="text-xs opacity-70">• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Current Staff */}
      {staffMembers.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">
            Current Staff ({staffMembers.length})
          </h2>
          <div className="rounded-2xl border border-[#1a1a28] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a28] bg-[#0f0f1a]">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a28]">
                {staffMembers.map(u => (
                  <tr key={u.id} className="hover:bg-[#0f0f1a] transition-colors">
                    <td className="px-4 py-3 text-white font-semibold">
                      {u.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {u.phone ? `+${u.phone}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {assigning === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-[#1a1a28] bg-[#0a0a12] text-white text-xs px-2 py-1"
                            defaultValue={u.staff_role ?? ''}
                            onChange={e => { if (e.target.value) assign(u.id, e.target.value) }}
                            disabled={saving === u.id}
                          >
                            {ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setAssigning(null)}
                            className="text-xs text-slate-600 hover:text-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <RoleBadge role={u.staff_role!} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAssigning(u.id)}
                          disabled={saving === u.id}
                          className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => revoke(u.id)}
                          disabled={saving === u.id}
                          className="text-xs text-red-600 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {saving === u.id ? '…' : 'Revoke'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Role */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">Assign Role to User</h2>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-[#1a1a28] bg-[#0f0f1a] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none"
          />
        </div>

        {search.length >= 2 && (
          <div className="rounded-2xl border border-[#1a1a28] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a28] bg-[#0f0f1a]">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Current Role</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-600">Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a28]">
                {filtered.slice(0, 20).map(u => (
                  <tr key={u.id} className="hover:bg-[#0f0f1a] transition-colors">
                    <td className="px-4 py-3 text-white font-semibold">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {u.phone ? `+${u.phone}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.staff_role ? <RoleBadge role={u.staff_role} /> : <span className="text-slate-700 text-xs">No role</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        className="rounded-lg border border-[#1a1a28] bg-[#0a0a12] text-white text-xs px-2 py-1 disabled:opacity-40"
                        value=""
                        onChange={e => { if (e.target.value) assign(u.id, e.target.value) }}
                        disabled={saving === u.id}
                      >
                        <option value="" disabled>Assign role…</option>
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-600 text-sm">
                      No users match your search
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {search.length < 2 && (
          <p className="text-xs text-slate-700">Type at least 2 characters to search users</p>
        )}
      </div>
    </div>
  )
}
