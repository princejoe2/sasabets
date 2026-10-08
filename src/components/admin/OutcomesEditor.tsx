'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Outcome = {
  id: string
  slug: string
  name: string
  image_url: string | null
  image_source: string | null
  image_credit: string | null
  image_override: boolean
  image_needs_review: boolean
  sort_order: number
  status: string
  color_index: number
  probability: number | null
}

type Props = { marketId: string; isBinary: boolean; onClose: () => void }

export default function OutcomesEditor({ marketId, isBinary, onClose }: Props) {
  const router = useRouter()
  const [outcomes,   setOutcomes]   = useState<Outcome[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [newName,    setNewName]    = useState('')
  const [delConfirm, setDelConfirm] = useState<string | null>(null)
  const [uploading,  setUploading]  = useState<string | null>(null)
  const fileRefs    = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { load() }, [marketId])

  async function load() {
    setLoading(true)
    const res  = await fetch(`/api/admin/market/${marketId}/outcomes`)
    const data = await res.json()
    setOutcomes(data.outcomes ?? [])
    setLoading(false)
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...outcomes]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setOutcomes(next.map((o, i) => ({ ...o, sort_order: i })))
  }

  function setStatus(id: string, status: string) {
    setOutcomes(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  function setName(id: string, name: string) {
    setOutcomes(prev => prev.map(o => o.id === id ? { ...o, name } : o))
  }

  async function uploadImage(outcome: Outcome, file: File) {
    setUploading(outcome.id)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(null)
    if (!res.ok) { setError(data.error ?? 'Upload failed'); return }
    setOutcomes(prev => prev.map(o =>
      o.id === outcome.id
        ? { ...o, image_url: data.url, image_override: true, image_needs_review: false, image_source: 'upload' }
        : o
    ))
  }

  async function addOutcome() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    if (outcomes.some(o => o.slug === slug)) { setError('Slug already exists — use a different name'); return }
    setOutcomes(prev => [...prev, {
      id:                 `new-${Date.now()}`,
      slug,
      name:               trimmed,
      image_url:          null,
      image_source:       null,
      image_credit:       null,
      image_override:     false,
      image_needs_review: true,
      sort_order:         prev.length,
      status:             'active',
      color_index:        prev.length % 8,
      probability:        null,
    }])
    setNewName('')
  }

  async function deleteOutcome(id: string) {
    if (id.startsWith('new-')) {
      setOutcomes(prev => prev.filter(o => o.id !== id).map((o, i) => ({ ...o, sort_order: i })))
      setDelConfirm(null)
      return
    }
    const res  = await fetch(`/api/admin/market/${marketId}/outcomes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcomeId: id }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Delete failed')
    } else {
      await load()
    }
    setDelConfirm(null)
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('')
    const payload = outcomes.map((o, i) => ({
      slug:               o.slug,
      name:               o.name,
      image_url:          o.image_url,
      image_source:       o.image_source,
      image_credit:       o.image_credit,
      image_override:     o.image_override,
      image_needs_review: o.image_needs_review,
      sort_order:         i,
      status:             o.status,
    }))
    const res  = await fetch(`/api/admin/market/${marketId}/outcomes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcomes: payload }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Save failed'); return }
    setSuccess(`Saved ${data.count} outcomes`)
    router.refresh()
    await load()
  }

  const STATUS_COLORS: Record<string, string> = {
    active:       'text-emerald-400 border-emerald-800/50',
    resolved_yes: 'text-amber-400 border-amber-800/50',
    resolved_no:  'text-slate-500 border-slate-700/50',
    eliminated:   'text-red-400 border-red-800/50',
  }

  return (
    <div className="rounded-2xl border border-sky-800/30 bg-[#0d0d18] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sky-400">Outcomes / Candidates</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {isBinary ? 'Binary market — reorder or rename only' : 'Multi-candidate — add, remove, reorder, upload images'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-sm">✕</button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-600">Loading…</div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {outcomes.map((o, idx) => (
              <div key={o.id} className="flex items-start gap-3 rounded-xl border border-[#1a1a28] bg-[#111120] p-3">
                {/* Image */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-[#1a1a28] flex items-center justify-center">
                    {o.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl text-slate-600">👤</span>
                    )}
                  </div>
                  {o.image_needs_review && !o.image_override && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border border-[#111120]" title="Needs image review" />
                  )}
                  {o.image_override && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sky-500 border border-[#111120]" title="Admin-uploaded image" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      value={o.name}
                      onChange={e => setName(o.id, e.target.value)}
                      className="flex-1 rounded-lg border border-[#1e1e2e] bg-[#0a0a14] px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-sky-700"
                    />
                    <span className="shrink-0 text-[10px] text-slate-600 font-mono">{o.slug}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status selector */}
                    <select
                      value={o.status}
                      onChange={e => setStatus(o.id, e.target.value)}
                      className={`rounded-lg border bg-[#0a0a14] px-2 py-0.5 text-[11px] font-bold focus:outline-none ${STATUS_COLORS[o.status] ?? 'text-slate-400 border-slate-700'}`}
                    >
                      <option value="active">active</option>
                      <option value="resolved_yes">resolved ✓ YES</option>
                      <option value="resolved_no">resolved ✗ NO</option>
                      <option value="eliminated">eliminated</option>
                    </select>

                    {/* Image upload */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={el => { fileRefs.current[o.id] = el }}
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(o, f) }}
                    />
                    <button
                      onClick={() => fileRefs.current[o.id]?.click()}
                      disabled={uploading === o.id}
                      className="rounded-lg border border-sky-800/50 px-2 py-0.5 text-[11px] font-bold text-sky-400 hover:bg-sky-900/20 disabled:opacity-50 transition-colors"
                    >
                      {uploading === o.id ? 'Uploading…' : '📷 Image'}
                    </button>

                    {/* Probability */}
                    {o.probability !== null && (
                      <span className="text-[11px] text-slate-500 tabular-nums font-semibold">
                        {(Number(o.probability) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-lg border border-[#1e1e2e] px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >↑</button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === outcomes.length - 1}
                    className="rounded-lg border border-[#1e1e2e] px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                  >↓</button>
                  {!isBinary && (
                    delConfirm === o.id ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => deleteOutcome(o.id)}
                          className="rounded-lg bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
                        >Yes</button>
                        <button
                          onClick={() => setDelConfirm(null)}
                          className="rounded-lg border border-[#1e1e2e] px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDelConfirm(o.id)}
                        className="rounded-lg border border-red-900/50 px-2 py-1 text-[11px] text-red-500 hover:bg-red-900/20 transition-colors"
                      >✕</button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add new outcome (multi-candidate only) */}
          {!isBinary && (
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOutcome()}
                placeholder="New candidate name…"
                className="flex-1 rounded-xl border border-[#1e1e2e] bg-[#0a0a14] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-700"
              />
              <button
                onClick={addOutcome}
                disabled={!newName.trim()}
                className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-40 transition-colors"
              >
                + Add
              </button>
            </div>
          )}

          {error   && <p className="mb-3 text-sm text-red-400 font-semibold">{error}</p>}
          {success && <p className="mb-3 text-sm text-emerald-400 font-semibold">{success}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-sky-700 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Outcomes'}
          </button>
        </>
      )}
    </div>
  )
}
