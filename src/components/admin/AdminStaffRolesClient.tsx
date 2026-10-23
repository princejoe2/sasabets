'use client'
import { useState } from 'react'
import { ALL_ADMIN_PAGES, ROLE_ALLOWED_PATHS } from '@/lib/admin-roles'
import type { StaffRole } from '@/lib/admin-roles'

type StaffRow = {
  id: string
  full_name: string | null
  email: string
  staff_role: string | null
  staff_permissions: string[] | null
  created_at: string
}

const ROLES = [
  { value: 'moderator', label: 'Moderator',        color: 'text-purple-400 border-purple-800/40 bg-purple-900/20', dot: 'bg-purple-500' },
  { value: 'settler',   label: 'Settler',           color: 'text-amber-400 border-amber-800/40 bg-amber-900/20',   dot: 'bg-amber-500'  },
  { value: 'support',   label: 'Support',           color: 'text-sky-400 border-sky-800/40 bg-sky-900/20',         dot: 'bg-sky-500'    },
  { value: 'analyst',   label: 'Analyst',           color: 'text-emerald-400 border-emerald-800/40 bg-emerald-900/20', dot: 'bg-emerald-500' },
  { value: 'content',   label: 'Content Manager',   color: 'text-rose-400 border-rose-800/40 bg-rose-900/20',      dot: 'bg-rose-500'   },
]

function groupPages() {
  const groups: Record<string, typeof ALL_ADMIN_PAGES> = {}
  for (const p of ALL_ADMIN_PAGES) {
    ;(groups[p.group] ??= []).push(p)
  }
  return groups
}

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

function StaffPanel({
  row,
  onUpdate,
  onClose,
}: {
  row: StaffRow
  onUpdate: (patch: Partial<StaffRow>) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'details' | 'role' | 'permissions'>('details')

  // Details state
  const [dName,  setDName]  = useState(row.full_name ?? '')
  const [dEmail, setDEmail] = useState(row.email)
  const [dSaving, setDSaving] = useState(false)
  const [dError,  setDError]  = useState('')
  const [dSaved,  setDSaved]  = useState(false)

  // Role state
  const [rSaving, setRSaving] = useState(false)
  const [rError,  setRError]  = useState('')

  // Permissions state
  const defaultPaths = row.staff_role
    ? (ROLE_ALLOWED_PATHS[row.staff_role as StaffRole] ?? ['/admin'])
    : ['/admin']
  const [selected, setSelected] = useState<Set<string>>(() => {
    const src = row.staff_permissions ?? defaultPaths
    return new Set(src.filter(p => p !== '/admin'))
  })
  const [pSaving, setPSaving] = useState(false)
  const [pError,  setPError]  = useState('')
  const groups = groupPages()

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    setDSaving(true); setDError(''); setDSaved(false)
    const res = await fetch('/api/admin/staff-roles/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.id, fullName: dName.trim(), email: dEmail.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setDError(data.error ?? 'Failed to save'); setDSaving(false); return }
    onUpdate({ full_name: dName.trim(), email: dEmail.trim() })
    setDSaved(true)
    setDSaving(false)
  }

  async function changeRole(role: string) {
    setRSaving(true); setRError('')
    const res = await fetch('/api/admin/staff-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.id, role }),
    })
    const data = await res.json()
    if (!res.ok) { setRError(data.error ?? 'Failed'); setRSaving(false); return }
    onUpdate({ staff_role: role })
    setRSaving(false)
  }

  function togglePage(href: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  async function savePermissions() {
    setPSaving(true); setPError('')
    const permissions = ['/admin', ...Array.from(selected)]
    const res = await fetch('/api/admin/staff-roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.id, permissions }),
    })
    const data = await res.json()
    if (!res.ok) { setPError(data.error ?? 'Failed to save'); setPSaving(false); return }
    onUpdate({ staff_permissions: permissions })
    setPSaving(false)
  }

  async function resetPermissions() {
    setPSaving(true); setPError('')
    const res = await fetch('/api/admin/staff-roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.id, permissions: null }),
    })
    const data = await res.json()
    if (!res.ok) { setPError(data.error ?? 'Failed to reset'); setPSaving(false); return }
    onUpdate({ staff_permissions: null })
    // Reset local toggles to role defaults
    const paths = defaultPaths.filter(p => p !== '/admin')
    setSelected(new Set(paths))
    setPSaving(false)
  }

  const isCustomPerms = row.staff_permissions !== null

  return (
    <div className="border-t border-[#1a1a28] bg-[#0a0a14]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[#1a1a28]">
        {(['details', 'role', 'permissions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors capitalize ${
              tab === t
                ? 'bg-[#0f0f1a] border border-b-0 border-[#1a1a28] text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'permissions' && isCustomPerms ? `Permissions ★` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          onClick={onClose}
          className="ml-auto text-slate-600 hover:text-slate-400 transition-colors px-2 pb-2 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-5 bg-[#0f0f1a]">
        {/* ── Details tab ─────────────────────────────────────────────── */}
        {tab === 'details' && (
          <form onSubmit={saveDetails} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={dName}
                  onChange={e => { setDName(e.target.value); setDSaved(false) }}
                  className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={dEmail}
                  onChange={e => { setDEmail(e.target.value); setDSaved(false) }}
                  placeholder="name@sabula256.com"
                  className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-700">Must end in @sabula256.com</p>
              </div>
            </div>
            {dError && <p className="text-sm text-red-400">{dError}</p>}
            {dSaved && <p className="text-sm text-emerald-400">Saved</p>}
            <button
              type="submit"
              disabled={dSaving}
              className="rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 px-5 py-2 text-sm font-bold text-white transition-colors"
            >
              {dSaving ? 'Saving…' : 'Save Details'}
            </button>
          </form>
        )}

        {/* ── Role tab ────────────────────────────────────────────────── */}
        {tab === 'role' && (
          <div className="space-y-4 max-w-lg">
            <p className="text-xs text-slate-500">
              Role sets the default page access. You can further customize it in the Permissions tab.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map(r => {
                const active = row.staff_role === r.value
                return (
                  <button
                    key={r.value}
                    onClick={() => changeRole(r.value)}
                    disabled={rSaving || active}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${
                      active
                        ? `${r.color} border-current`
                        : 'border-[#1a1a28] bg-[#0a0a12] text-slate-400 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${active ? r.dot : 'bg-slate-700'}`} />
                    <span className="text-sm font-bold">{r.label}</span>
                    {active && <span className="ml-auto text-[10px] font-black uppercase tracking-widest opacity-60">Active</span>}
                  </button>
                )
              })}
            </div>
            {rError && <p className="text-sm text-red-400">{rError}</p>}
          </div>
        )}

        {/* ── Permissions tab ─────────────────────────────────────────── */}
        {tab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-500">
                {isCustomPerms
                  ? `Custom — ${selected.size} page${selected.size !== 1 ? 's' : ''} granted`
                  : `Role defaults — ${defaultPaths.filter(p => p !== '/admin').length} pages granted`}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelected(new Set(ALL_ADMIN_PAGES.map(p => p.href)))}
                  className="rounded-lg border border-[#1a1a28] bg-[#0a0a12] px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white">
                  All
                </button>
                <button onClick={() => setSelected(new Set())}
                  className="rounded-lg border border-[#1a1a28] bg-[#0a0a12] px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white">
                  None
                </button>
                {row.staff_role && (
                  <button onClick={() => setSelected(new Set(defaultPaths.filter(p => p !== '/admin')))}
                    className="rounded-lg border border-violet-800/40 bg-violet-900/20 px-3 py-1 text-xs font-semibold text-violet-400 hover:text-violet-300">
                    Role defaults
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(groups).map(([groupName, pages]) => (
                <div key={groupName}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1.5">{groupName}</p>
                  <div className="flex flex-wrap gap-2">
                    {pages.map(p => {
                      const on = selected.has(p.href)
                      return (
                        <button key={p.href} onClick={() => togglePage(p.href)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                            on
                              ? 'border-violet-700/60 bg-violet-900/30 text-violet-300'
                              : 'border-[#1a1a28] bg-[#0a0a12] text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${on ? 'bg-violet-400' : 'bg-slate-700'}`} />
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-700 border-t border-[#1a1a28] pt-3">
              Dashboard is always accessible.
            </p>

            {pError && <p className="text-sm text-red-400">{pError}</p>}

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={savePermissions} disabled={pSaving}
                className="rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 px-5 py-2 text-sm font-bold text-white transition-colors">
                {pSaving ? 'Saving…' : 'Save Permissions'}
              </button>
              {isCustomPerms && (
                <button onClick={resetPermissions} disabled={pSaving}
                  className="rounded-xl border border-[#1a1a28] hover:border-slate-600 disabled:opacity-40 px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                  Reset to role defaults
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminStaffRolesClient({ staff }: { staff: StaffRow[] }) {
  const [rows, setRows] = useState<StaffRow[]>(staff)

  const [form, setForm] = useState({ fullName: '', email: '', role: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState<{ email: string; fullName: string; role: string } | null>(null)

  const [saving, setSaving] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [resent, setResent] = useState<string | null>(null)

  const [openPanel, setOpenPanel] = useState<string | null>(null)

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError(''); setCreated(null)
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
        staff_role: data.role, staff_permissions: null, created_at: new Date().toISOString(),
      }, ...prev])
    } finally { setCreating(false) }
  }

  async function resendCredentials(userId: string, email: string) {
    setSaving(userId); setActionError(''); setResent(null)
    const res = await fetch('/api/admin/staff-roles/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Failed to resend') }
    else setResent(email)
    setSaving(null)
  }

  async function revoke(userId: string) {
    if (!confirm('Revoke this staff member\'s access? They will no longer be able to access the admin panel.')) return
    setSaving(userId); setActionError('')
    const res = await fetch('/api/admin/staff-roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Failed') }
    else { setRows(prev => prev.filter(u => u.id !== userId)); setOpenPanel(null) }
    setSaving(null)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-white">Staff Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage staff accounts. All accounts must use a <strong className="text-slate-400">@sabula256.com</strong> email.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0f0f1a] p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">Create Staff Account</h2>
        <form onSubmit={createAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Full Name</label>
              <input type="text" placeholder="e.g. Jane Nakato" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required
                className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Email Address</label>
              <input type="email" placeholder="name@sabula256.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                className="w-full rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:border-slate-600 focus:outline-none" />
              <p className="mt-1 text-[10px] text-slate-700">Must be a @sabula256.com address</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Starting Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required
              className="w-full max-w-xs rounded-xl border border-[#1a1a28] bg-[#0a0a12] px-4 py-2.5 text-sm text-white focus:border-slate-600 focus:outline-none">
              <option value="" disabled>Select a role…</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-slate-600">Customize exact page access after creating the account.</p>
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={creating}
              className="rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 px-6 py-2.5 text-sm font-bold text-white transition-colors">
              {creating ? 'Creating…' : 'Create Account & Send Credentials'}
            </button>
            <p className="text-xs text-slate-600">Credentials and 2FA QR sent by email automatically.</p>
          </div>
        </form>
        {created && (
          <div className="mt-5 rounded-xl border border-emerald-800/40 bg-emerald-900/20 px-4 py-3">
            <p className="text-sm font-bold text-emerald-400">Account created</p>
            <p className="text-xs text-emerald-600 mt-1">
              Credentials sent to <strong className="text-emerald-400">{created.email}</strong> ({ROLES.find(r => r.value === created.role)?.label}).
            </p>
          </div>
        )}
      </div>

      {/* Feedback */}
      {actionError && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">{actionError}</div>
      )}
      {resent && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-400">
          Credentials resent to <strong>{resent}</strong>
        </div>
      )}

      {/* Staff list */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">Active Staff ({rows.length})</h2>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-700">No staff accounts yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(u => (
              <div key={u.id} className="rounded-2xl border border-[#1a1a28] bg-[#0f0f1a] overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.full_name ?? '—'}</p>
                    <p className="text-xs font-mono text-slate-500 truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {u.staff_role && <RoleBadge role={u.staff_role} />}
                    {u.staff_permissions !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-700/40 bg-violet-900/20 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        Custom ({u.staff_permissions.filter(p => p !== '/admin').length})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setOpenPanel(prev => prev === u.id ? null : u.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        openPanel === u.id
                          ? 'border-violet-700/60 bg-violet-900/30 text-violet-300'
                          : 'border-[#1a1a28] bg-[#0a0a12] text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {openPanel === u.id ? 'Close' : 'Manage'}
                    </button>
                    <button onClick={() => resendCredentials(u.id, u.email)} disabled={saving === u.id}
                      className="text-xs text-sky-600 hover:text-sky-400 transition-colors disabled:opacity-40">
                      Resend
                    </button>
                    <button onClick={() => revoke(u.id)} disabled={saving === u.id}
                      className="text-xs text-red-600 hover:text-red-400 transition-colors disabled:opacity-40">
                      {saving === u.id ? '…' : 'Revoke'}
                    </button>
                  </div>
                </div>

                {/* Expandable panel */}
                {openPanel === u.id && (
                  <StaffPanel
                    row={u}
                    onUpdate={patch => setRows(prev => prev.map(r => r.id === u.id ? { ...r, ...patch } : r))}
                    onClose={() => setOpenPanel(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
