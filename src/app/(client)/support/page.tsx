'use client'
import { useEffect, useState } from 'react'

interface Complaint {
  id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  admin_note: string | null
  created_at: string
}

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

export default function SupportPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function load() {
    const res = await fetch('/api/support/complaint')
    if (res.ok) {
      const data = await res.json()
      setComplaints(data.complaints ?? [])
    }
  }

  useEffect(() => { load() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setMsg({ text: 'Please fill in both fields.', ok: false }); return
    }
    setBusy(true); setMsg(null)
    const res = await fetch('/api/support/complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ text: 'Your message has been sent. We will get back to you.', ok: true })
      setSubject(''); setMessage('')
      await load()
    } else {
      setMsg({ text: data.error ?? 'Failed to send. Try again.', ok: false })
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-black text-white">Support</h1>
      <p className="mt-1 text-slate-500">Have an issue or a question? Send us a message.</p>

      {/* Form */}
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Subject</label>
          <input
            value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="What is this about?"
            className="mt-1 w-full rounded-xl border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Message</label>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            rows={5} placeholder="Describe your issue…"
            className="mt-1 w-full rounded-xl border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors resize-none"
          />
        </div>
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
            {msg.text}
          </div>
        )}
        <button
          type="submit" disabled={busy}
          className="btn-glow rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Sending…' : 'Submit'}
        </button>
      </form>

      {/* History */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-600">Your Messages</h2>
        {complaints.length === 0 ? (
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-10 text-center text-sm text-slate-600">
            You have not sent any messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => (
              <div key={c.id} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-slate-200">{c.subject}</p>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[c.status] ?? ''}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{c.message}</p>
                {c.admin_note && (
                  <div className="mt-3 rounded-xl border border-violet-900/40 bg-violet-950/20 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Response</p>
                    <p className="mt-0.5 text-sm text-slate-300 whitespace-pre-wrap">{c.admin_note}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-600">
                  {new Date(c.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
