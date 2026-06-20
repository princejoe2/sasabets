'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Setup2FAPage() {
  const router = useRouter()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    fetch('/api/admin/2fa/setup')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setFetchError(data.error); return }
        setQrDataUrl(data.qrDataUrl)
        setSecret(data.secret)
      })
      .catch(() => setFetchError('Failed to load setup'))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit code from your app'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Verification failed'); setLoading(false); return }
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-[#08080e] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 border border-red-700/40 text-2xl mb-4">
            🔐
          </div>
          <h1 className="text-2xl font-black text-white">Set up 2-Factor Auth</h1>
          <p className="mt-2 text-sm text-slate-500">
            Scan the QR code with Google Authenticator to protect your admin account.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
          {/* Step 1 */}
          <div className="p-6 border-b border-[#1a1a28]">
            <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-3">Step 1</p>
            <p className="text-sm font-semibold text-slate-300 mb-4">
              Open <strong className="text-white">Google Authenticator</strong> and scan this QR code
            </p>

            {fetchError ? (
              <p className="text-sm text-red-400">{fetchError}</p>
            ) : !qrDataUrl ? (
              <div className="flex items-center justify-center h-[240px]">
                <span className="text-slate-600 text-sm animate-pulse">Generating…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-3 shadow-lg shadow-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
                </div>
                <div className="w-full">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                    Or enter this key manually
                  </p>
                  <p className="rounded-xl bg-[#0a0a14] border border-[#1a1a28] px-4 py-2.5 text-center font-mono text-sm text-slate-300 tracking-widest select-all">
                    {secret.match(/.{1,4}/g)?.join(' ') ?? secret}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-3">Step 2</p>
            <p className="text-sm font-semibold text-slate-300 mb-4">
              Enter the 6-digit code shown in the app to confirm setup
            </p>

            <form onSubmit={submit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                maxLength={6}
                className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3.5 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none focus:border-red-700 transition-colors"
                autoFocus
              />

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length !== 6 || !qrDataUrl}
                className="w-full rounded-xl bg-red-700 py-3.5 text-sm font-black hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {loading ? 'Verifying…' : 'Enable 2FA & Enter Dashboard'}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-700">
          You will need to verify your authenticator code once every 8 hours.
        </p>
      </div>
    </div>
  )
}
