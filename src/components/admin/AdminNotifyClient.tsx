'use client'
import { useState } from 'react'

interface User { id: string; phone: string; name: string | null }

type Target = 'all' | 'select'

export default function AdminNotifyClient({ users }: { users: User[] }) {
  const [target, setTarget] = useState<Target>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')

  function toggleUser(id: string) {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
  }

  const recipients = target === 'all' ? users : users.filter(u => selected.has(u.id))
  const charCount = message.length
  const smsCount = Math.ceil(charCount / 160)

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || recipients.length === 0) return
    setLoading(true); setError(''); setResult(null)

    const res = await fetch('/api/admin/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones: recipients.map(u => u.phone), message }),
    })
    const data = await res.json()

    if (res.ok) {
      setResult(data)
      setMessage('')
    } else {
      setError(data.error ?? 'Failed to send')
    }
    setLoading(false)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Compose */}
      <div className="space-y-6">
        {/* Target selection */}
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
          <h2 className="mb-4 font-black text-slate-200">Who to notify</h2>
          <div className="flex gap-3">
            {(['all', 'select'] as Target[]).map(t => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${
                  target === t
                    ? 'border-red-700/60 bg-red-900/20 text-red-400'
                    : 'border-[#1a1a28] text-slate-500 hover:border-[#2a2a3e] hover:text-slate-300'
                }`}
              >
                {t === 'all' ? `All Users (${users.length})` : `Select Users`}
              </button>
            ))}
          </div>

          {target === 'select' && (
            <div className="mt-4 space-y-1 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-xs text-slate-600">{selected.size} selected</span>
                <button
                  onClick={() => setSelected(selected.size === users.length ? new Set() : new Set(users.map(u => u.id)))}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  {selected.size === users.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#1a1a28] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="accent-red-600"
                  />
                  <span className="text-sm font-mono text-slate-300">+{u.phone}</span>
                  {u.name && <span className="text-xs text-slate-600">{u.name}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Message compose */}
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
          <h2 className="mb-4 font-black text-slate-200">Message</h2>
          <form onSubmit={sendNotification} className="space-y-4">
            <div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here…"
                rows={5}
                className="w-full resize-none rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors"
              />
              <div className="mt-1.5 flex justify-between text-xs text-slate-600">
                <span>{charCount} characters</span>
                <span>{smsCount} SMS credit{smsCount !== 1 ? 's' : ''} per recipient</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {result && (
              <div className="rounded-xl bg-emerald-900/20 border border-emerald-800/30 px-4 py-3">
                <p className="text-sm font-bold text-emerald-400">
                  ✓ Sent to {result.sent} recipient{result.sent !== 1 ? 's' : ''}
                  {result.failed > 0 && ` · ${result.failed} failed`}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !message.trim() || recipients.length === 0}
              className="w-full rounded-xl bg-red-700 py-3.5 text-sm font-black hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              {loading
                ? 'Sending…'
                : `Send to ${recipients.length} user${recipients.length !== 1 ? 's' : ''}`}
            </button>
          </form>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6 sticky top-8">
          <h2 className="mb-4 font-black text-slate-200">Preview</h2>
          <div className="rounded-2xl bg-[#1a1a28] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">S</div>
              <div>
                <p className="text-xs font-bold text-slate-300">Sabula 256</p>
                <p className="text-[10px] text-slate-600">SMS</p>
              </div>
            </div>
            <div className="rounded-2xl rounded-tl-none bg-[#0d0d18] px-3 py-2.5">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {message || <span className="text-slate-600">Your message will appear here…</span>}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#1a1a28] p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recipients</p>
            <p className="text-2xl font-black text-white">{recipients.length}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {recipients.length === users.length ? 'All registered users' : `Selected users`}
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-[#1a1a28] p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Est. SMS Credits</p>
            <p className="text-lg font-black text-amber-400">{recipients.length * smsCount}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{smsCount} per recipient · {recipients.length} recipients</p>
          </div>
        </div>
      </div>
    </div>
  )
}
