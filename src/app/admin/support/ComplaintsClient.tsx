'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Complaint {
  id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  admin_note: string | null
  created_at: string
  updated_at: string | null
  profiles: { phone: string; full_name: string | null } | null
}

type Filter = 'all' | 'open' | 'in_progress' | 'resolved'

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-amber-900/30 text-amber-400 border-amber-800/40',
  in_progress: 'bg-blue-900/30 text-blue-400 border-blue-800/40',
  resolved:    'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const TABS: { key: Filter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',    label: 'Resolved' },
]

export default function ComplaintsClient() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/admin/complaints')
    if (res.ok) {
      const data = await res.json()
      setComplaints(data.complaints ?? [])
    }
  }

  useEffect(() => {
    load()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => { load() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function update(id: string, payload: { status?: string; admin_note?: string }) {
    setBusy(id)
    const res = await fetch('/api/admin/complaints', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    if (res.ok) {
      const data = await res.json()
      const updated = data.complaint
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
    }
    setBusy(null)
  }

  const counts = useMemo(() => ({
    open:        complaints.filter(c => c.status === 'open').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved:    complaints.filter(c => c.status === 'resolved').length,
  }), [complaints])

  const visible = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-black text-slate-200">Support Tickets</h2>
        {counts.open > 0 && (
          <span className="rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">{counts.open} open</span>
        )}
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === t.key
                ? 'bg-violet-600/20 text-violet-300 border border-violet-700/50'
                : 'border border-[#1a1a28] text-slate-500 hover:text-white'
            }`}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && (
              <span className="ml-1.5 text-slate-500">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-12 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-bold text-slate-400">No tickets here</p>
          <p className="text-sm text-slate-600 mt-1">Nothing matches this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(c => (
            <div key={c.id} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-200">{c.subject}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    +{c.profiles?.phone ?? '—'}
                    {c.profiles?.full_name && ` · ${c.profiles.full_name}`}
                    {' · '}
                    {new Date(c.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[c.status] ?? ''}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-400 whitespace-pre-wrap">{c.message}</p>

              {/* Admin note editor */}
              <div className="mt-4 space-y-2">
                <textarea
                  value={notes[c.id] ?? c.admin_note ?? ''}
                  onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
                  rows={2}
                  placeholder="Add an admin note / response…"
                  className="w-full rounded-xl border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-white outline-none focus:border-violet-600 transition-colors resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => update(c.id, { admin_note: notes[c.id] ?? c.admin_note ?? '' })}
                    disabled={busy === c.id}
                    className="rounded-xl border border-[#2a2a3e] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-violet-700 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => update(c.id, { status: 'in_progress' })}
                    disabled={busy === c.id || c.status === 'in_progress'}
                    className="rounded-xl bg-blue-900/40 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/60 disabled:opacity-40 transition-colors"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => update(c.id, { status: 'resolved' })}
                    disabled={busy === c.id || c.status === 'resolved'}
                    className="rounded-xl bg-emerald-900/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 transition-colors"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
