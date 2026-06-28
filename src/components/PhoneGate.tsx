'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SKIP_KEY = 'phone-gate-skipped'

export default function PhoneGate() {
  const [visible, setVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SKIP_KEY)) return

    const supabase = createClient()

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const provider = user.app_metadata?.provider as string | undefined
      if (provider !== 'google') return

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

      if (!profile?.phone) {
        setVisible(true)
      }
    }

    check()
  }, [])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(SKIP_KEY, '1')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const raw = phone.replace(/[\s\-()]/g, '')
    if (!/^(\+256|256|0)(7\d{8}|39\d{7})$/.test(raw)) {
      setError('Enter a valid Ugandan mobile number (e.g. 0771234567)')
      return
    }

    const ph = raw.startsWith('+256') ? raw
             : raw.startsWith('256')  ? '+' + raw
             : '+256' + raw.slice(1)

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ph }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Failed to save phone number')
        return
      }

      setVisible(false)
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        style={{ animation: 'pg-fade 0.2s ease both' }}
      />

      {/* Centering wrapper — never animated, just positions */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        {/* Modal — only this gets the pop animation */}
        <div
          className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
          style={{ animation: 'pg-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {/* Violet header */}
          <div className="relative bg-violet-600 px-6 py-6 text-center">
            {/* Phone icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .82h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 15z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white">Add your phone number</h2>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-7">
            <p className="mb-5 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Your phone number is required to make deposits and withdrawals via
              MTN MoMo or Airtel Money.
            </p>

            <div className="mb-4">
              <label
                htmlFor="pg-phone"
                className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Uganda phone number
              </label>
              <input
                id="pg-phone"
                type="tel"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value)
                  setError('')
                }}
                placeholder="0712 345 678"
                autoComplete="tel"
                inputMode="tel"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-bold text-white transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save & continue'}
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="mt-4 w-full py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pg-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pg-pop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
