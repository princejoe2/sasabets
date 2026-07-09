'use client'
import { useState } from 'react'

type StaffRow = { id: string; full_name: string | null; email: string; staff_role: string | null; created_at: string }

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
    note: 'Fund adjustments capped at UGX 100,000 per transaction',
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

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role)
  if (!r) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${r.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  )
}

export default function AdminStaffRolesClient({ staff }: { staff: StaffRow[] }) {
  const [rows, setRows] = useState<StaffRow[]>(staff)

  // Create form state
  const [form, setForm] = useState({ fullName: '', email: '', role: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState<{ email: string; fullName: string; role: string } | null>(null)

  // Role change / revoke state
  const [saving, setSaving] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreated(null)
    try {
      const res = await fetch('/api/admin/staff-roles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Failed to create account'); return }
      setCreated({ email: data.email, fullName: data.fullName, role: data.role })
      setForm({ fullName: '', email: '', role: '' })
      setRows(prev => [{
        id: data.userId, full_name: data.fullName, email: data.email,
        staff_role: data.role, created_at: new Date().toISOString(),
      }, ...prev])
    } finally { setCreating(false) }
  }

  async function changeRole(userId: string, role: string) {
    setSaving(userId); setActionError('')
    const res = await fetch('/api/admin/staff-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Failed') }
    else setRows(prev => prev.map(u => u.id === userId ? { ...u, staff_role: role } : u))
    setSaving(null)
  }

  async function revoke(userId: string) {
    if (!confirm('Revoke this staff member\'s access? They will no longer be able to log in to the admin panel.')) return
    setSaving(userId); setActionError('')
    const res = await fetch('/api/admin/staff-roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Failed') }
    else setRows(prev => prev.filter(u => u.id !== userId))
    setSaving(null)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-white">Staff Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create staff accounts — credentials and 2FA setup are emailed automatically. Only the super admin can manage staff.
        </p>
      </div>

      {/* Role reference cards */}
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
              {r.note && (
                <p className="mt-2 text-xs opacity-60 italic border-t border-current/20 pt-2">{r.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create account form */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0f0f1a] p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">Create Staff Account</h2>
        <form onSubmit={createAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Nakato"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                required
                className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              required
              className="w-full max-w-xs rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white focus:border-slate-600 focus:outline-none"
            >
              <option value="" disabled>Select a role…</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 px-6 py-2.5 text-sm font-bold text-white transition-colors"
            >
              {creating ? 'Creating…' : 'Create Account & Send Credentials'}
            </button>
            <p className="text-xs text-slate-600">A password and 2FA QR code will be emailed to the staff member automatically.</p>
          </div>
        </form>

        {/* Success banner */}
        {created && (
          <div className="mt-5 rounded-xl border border-emerald-800/40 bg-emerald-900/20 px-4 py-3">
            <p className="text-sm font-bold text-emerald-400">Account created successfully</p>
            <p className="text-xs text-emerald-600 mt-1">
              Credentials and 2FA setup instructions sent to <strong className="text-emerald-400">{created.email}</strong> ({ROLES.find(r=>r.value===created.role)?.label}).
            </p>
          </div>
        )}
      </div>

      {/* Staff list */}
      {actionError && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">
          Active Staff ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-700">No staff accounts yet. Create one above.</p>
        ) : (
          <div className="rounded-2xl border border-[#1a1a28] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a28] bg-[#0f0f1a]">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-600">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a28]">
                {rows.map(u => (
                  <tr key={u.id} className="hover:bg-[#0f0f1a] transition-colors">
                    <td className="px-4 py-3 text-white font-semibold">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.staff_role!} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <select
                          className="rounded-lg border border-[#1a1a28] bg-[#0a0a12] text-white text-xs px-2 py-1 disabled:opacity-40"
                          value=""
                          onChange={e => { if (e.target.value) changeRole(u.id, e.target.value) }}
                          disabled={saving === u.id}
                        >
                          <option value="" disabled>Change role…</option>
                          {ROLES.filter(r => r.value !== u.staff_role).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
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
        )}
      </div>
    </div>
  )
}
