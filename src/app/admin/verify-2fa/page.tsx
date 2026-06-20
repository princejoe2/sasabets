'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Verify2FAPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/admin/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Verification failed')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-[#08080e] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 border border-red-700/40 text-2xl mb-4">
            🔐
          </div>
          <h1 className="text-2xl font-black text-white">Admin Verification</h1>
          <p className="mt-2 text-sm text-slate-500">
            Open Google Authenticator and enter the 6-digit code for Sabula 256.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
          <form onSubmit={submit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              maxLength={6}
              autoFocus
              className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] text-white outline-none focus:border-red-700 transition-colors"
            />

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-red-700 py-3.5 text-sm font-black hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify & Enter'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={signOut}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            ← Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
