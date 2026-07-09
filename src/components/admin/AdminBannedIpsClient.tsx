'use client'
import { useState, useEffect } from 'react'

interface BannedIp {
  ip: string
  reason: string
  banned_at: string
  expires_at: string | null
  banned_by: string
}

export default function AdminBannedIpsClient() {
  const [rows, setRows] = useState<BannedIp[]>([])
  const [loading, setLoading] = useState(true)
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/banned-ips')
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function ban(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setSaving(true)
    try {
      const res = await fetch('/api/admin/banned-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip.trim(), reason, expires_at: expiresAt || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setSuccess(`${ip} banned`)
      setIp(''); setReason(''); setExpiresAt('')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function unban(ip: string) {
    if (!confirm(`Unban ${ip}?`)) return
    setError(''); setSuccess('')
    const res = await fetch('/api/admin/banned-ips', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setSuccess(`${ip} unbanned`)
    load()
  }

  return (
    <div className="space-y-8">
      {/* Ban form */}
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Ban an IP address</h2>
        <form onSubmit={ban} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">IP address</label>
              <input
                value={ip}
                onChange={e => setIp(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                required
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason (optional)</label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Spam, abuse, fraud…"
                maxLength={500}
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expires (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Banning…' : 'Ban IP'}
          </button>
        </form>
      </div>

      {/* Banned list */}
      <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Banned IPs</h2>
          <span className="text-sm text-slate-500">{rows.length} entries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No banned IPs.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-white/10">
                <th className="px-6 py-3 text-left">IP</th>
                <th className="px-6 py-3 text-left">Reason</th>
                <th className="px-6 py-3 text-left">Banned at</th>
                <th className="px-6 py-3 text-left">Expires</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.ip} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-3 font-mono text-white">{row.ip}</td>
                  <td className="px-6 py-3 text-slate-400 max-w-xs truncate">{row.reason || '—'}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(row.banned_at).toLocaleString('en-UG')}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {row.expires_at
                      ? new Date(row.expires_at) < new Date()
                        ? <span className="text-yellow-500">Expired</span>
                        : new Date(row.expires_at).toLocaleString('en-UG')
                      : <span className="text-red-400">Permanent</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => unban(row.ip)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Unban
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
