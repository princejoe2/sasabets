'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Market {
  id: string
  title: string
  options: Array<{ id: string; label: string; total_pool: number }>
  metadata?: Record<string, unknown>
}

type EvidenceImg = {
  id: string
  previewUrl: string
  caption: string
  status: 'uploading' | 'done' | 'error'
  remoteUrl?: string
}

export default function SettleMarketForm({ market, onDone }: { market: Market; onDone: () => void }) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [winner,   setWinner]   = useState('')
  const [note,     setNote]     = useState('')
  const [evidence, setEvidence] = useState<EvidenceImg[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const isUserCreated = market.metadata?.user_created === true

  async function addImages(files: FileList) {
    const slots = 3 - evidence.length
    if (slots <= 0) return

    const incoming: EvidenceImg[] = Array.from(files).slice(0, slots).map(f => ({
      id:         Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(f),
      caption:    '',
      status:     'uploading' as const,
    }))
    setEvidence(prev => [...prev, ...incoming])

    // Upload each in parallel
    await Promise.all(
      Array.from(files).slice(0, slots).map(async (file, i) => {
        const img = incoming[i]
        const fd  = new FormData()
        fd.append('file', file)
        fd.append('marketId', market.id)
        const res  = await fetch('/api/admin/upload-evidence', { method: 'POST', body: fd })
        const data = await res.json()
        setEvidence(prev => prev.map(e => e.id === img.id
          ? res.ok
            ? { ...e, status: 'done', remoteUrl: data.url }
            : { ...e, status: 'error' }
          : e
        ))
      })
    )
  }

  async function handleSettle() {
    if (!winner) { setError('Select a winning option'); return }
    if (evidence.some(e => e.status === 'uploading')) { setError('Images are still uploading — please wait'); return }
    if (evidence.some(e => e.status === 'error')) { setError('Some images failed to upload — remove them and retry'); return }

    const ready = evidence.filter(e => e.remoteUrl)
    const evidencePayload = ready.length > 0
      ? JSON.stringify(ready.map(e => ({ url: e.remoteUrl!, caption: e.caption.trim() })))
      : undefined

    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/settle', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketId:        market.id,
        winningOptionId: winner,
        settlementNote:  note,
        evidenceUrl:     evidencePayload,
      }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed')
    else { onDone(); router.refresh() }
    setLoading(false)
  }

  const uploading = evidence.some(e => e.status === 'uploading')

  return (
    <div className="rounded-xl border border-emerald-800 bg-[#13131a] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-emerald-400">Settle: {market.title}</h3>
        {isUserCreated && (
          <span className="rounded-full border border-violet-700/40 bg-violet-900/20 px-2 py-0.5 text-[10px] font-black text-violet-400">
            🌍 COMMUNITY
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">Select the winning outcome. Payouts will be distributed automatically.</p>

      {/* Options */}
      <div className="space-y-2">
        {market.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => setWinner(opt.id)}
            className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
              winner === opt.id
                ? 'border-emerald-600 bg-emerald-900/30 text-white'
                : 'border-[#1e1e2e] text-slate-300 hover:border-emerald-800'
            }`}
          >
            {opt.label} — UGX {Number(opt.total_pool ?? 0).toLocaleString()}
          </button>
        ))}
      </div>

      {/* Settlement note */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Settlement note <span className="text-slate-600 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add context or source for the audit trail…"
          rows={2}
          className="w-full rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-700 resize-none placeholder:text-slate-700"
        />
      </div>

      {/* Evidence images */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Evidence images — optional
          </label>
          {evidence.length > 0 && evidence.length < 3 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              + Add more
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addImages(e.target.files) }}
        />

        {evidence.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#1e1e2e] py-6 text-xs text-slate-600 hover:border-emerald-800 hover:text-emerald-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload screenshots as proof (up to 3 images)
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {evidence.map(img => (
              <div key={img.id}>
                <div className="relative aspect-square overflow-hidden rounded-lg border border-[#1e1e2e] bg-[#0d0d14]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt="evidence preview" className="h-full w-full object-cover" />
                  {img.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    </div>
                  )}
                  {img.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/70">
                      <span className="text-[10px] font-bold text-red-300">Upload failed</span>
                    </div>
                  )}
                  {img.status === 'done' && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white">✓</span>
                  )}
                  <button
                    onClick={() => setEvidence(prev => prev.filter(e => e.id !== img.id))}
                    className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-slate-300 hover:text-white text-[11px] leading-none"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  value={img.caption}
                  onChange={e => setEvidence(prev => prev.map(ev => ev.id === img.id ? { ...ev, caption: e.target.value } : ev))}
                  placeholder="What does this show?"
                  maxLength={120}
                  className="mt-1 w-full rounded border border-[#1e1e2e] bg-[#111118] px-1.5 py-1 text-[10px] text-slate-400 outline-none focus:border-emerald-700 placeholder:text-slate-700"
                />
              </div>
            ))}
          </div>
        )}

        {evidence.length > 0 && evidence.length < 3 && (
          <p className="mt-1.5 text-[10px] text-slate-600">
            {3 - evidence.length} more image{3 - evidence.length !== 1 ? 's' : ''} can be added
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSettle}
          disabled={loading || uploading || !winner}
          className="flex-1 rounded-lg bg-emerald-700 py-2.5 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Settling…' : uploading ? 'Uploading images…' : 'Confirm & Settle'}
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-[#1e1e2e] px-4 py-2.5 text-sm hover:bg-[#1e1e2e] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
