'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LIMITS = [
  { label: 'No limit',      value: null    },
  { label: 'UGX 5,000',    value: 5000    },
  { label: 'UGX 10,000',   value: 10000   },
  { label: 'UGX 25,000',   value: 25000   },
  { label: 'UGX 50,000',   value: 50000   },
  { label: 'UGX 100,000',  value: 100000  },
  { label: 'UGX 250,000',  value: 250000  },
]

const EXCLUSIONS = [
  { label: '1 week',      days: 7   },
  { label: '1 month',     days: 30  },
  { label: '3 months',    days: 90  },
  { label: '6 months',    days: 180 },
  { label: 'Permanently', days: 36500 },
]

export default function ResponsibleGamblingPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [currentLimit,     setCurrentLimit]     = useState<number | null>(null)
  const [selectedLimit,    setSelectedLimit]     = useState<number | null | 'unchanged'>('unchanged')
  const [excludedUntil,    setExcludedUntil]     = useState<string | null>(null)
  const [excludeDays,      setExcludeDays]       = useState<number | null>(null)
  const [confirmExclude,   setConfirmExclude]    = useState(false)
  const [saving,           setSaving]            = useState(false)
  const [msg,              setMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const [loaded,           setLoaded]            = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      const { data: p } = await supabase.from('profiles')
        .select('daily_deposit_limit, self_excluded_until')
        .eq('id', user.id).single()
      setCurrentLimit(p?.daily_deposit_limit ?? null)
      setExcludedUntil(p?.self_excluded_until ?? null)
      setLoaded(true)
    }
    load()
  }, [])

  async function saveLimit() {
    if (selectedLimit === 'unchanged') return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/responsible-gambling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_deposit_limit: selectedLimit }),
    })
    if (res.ok) {
      setCurrentLimit(selectedLimit)
      setSelectedLimit('unchanged')
      setMsg({ text: 'Daily deposit limit updated.', ok: true })
    } else {
      setMsg({ text: 'Failed to save. Try again.', ok: false })
    }
    setSaving(false)
  }

  async function applySelfExclusion() {
    if (!excludeDays) return
    setSaving(true); setMsg(null)
    const until = new Date(Date.now() + excludeDays * 86400000).toISOString()
    const res = await fetch('/api/responsible-gambling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ self_excluded_until: until }),
    })
    if (res.ok) {
      setExcludedUntil(until)
      setConfirmExclude(false)
      setExcludeDays(null)
      setMsg({ text: 'Self-exclusion applied. You will be signed out.', ok: true })
      setTimeout(() => supabase.auth.signOut().then(() => router.push('/')), 2000)
    } else {
      setMsg({ text: 'Failed to apply exclusion.', ok: false })
    }
    setSaving(false)
  }

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-slate-500">Loading…</p></div>
  }

  const isExcluded = excludedUntil && new Date(excludedUntil) > new Date()

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-500">Safety tools</p>
          <h1 className="text-3xl font-black text-white">Responsible Gambling</h1>
          <p className="mt-2 text-slate-500">Set limits to keep your play in check. These tools are here to help you stay in control.</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* Self-excluded banner */}
        {isExcluded && (
          <div className="rounded-2xl border border-red-800/40 bg-red-900/10 px-5 py-4">
            <p className="font-bold text-red-400">You are currently self-excluded</p>
            <p className="mt-1 text-sm text-slate-400">
              Your exclusion ends on <strong>{new Date(excludedUntil!).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              During this period, deposits are blocked and you cannot place predictions.
            </p>
          </div>
        )}

        {/* Daily deposit limit */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-200">Daily Deposit Limit</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cap how much you can deposit in a single calendar day (Uganda time).
              {currentLimit && <> Current limit: <span className="text-violet-400 font-semibold">UGX {currentLimit.toLocaleString()}/day</span></>}
              {!currentLimit && <> You currently have <span className="text-slate-400">no limit</span> set.</>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {LIMITS.map(l => (
              <button
                key={String(l.value)}
                onClick={() => setSelectedLimit(l.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                  selectedLimit === l.value
                    ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                    : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            onClick={saveLimit}
            disabled={saving || selectedLimit === 'unchanged'}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Limit'}
          </button>
        </div>

        {/* Self-exclusion */}
        {!isExcluded && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
            <div>
              <h2 className="font-bold text-slate-200">Self-Exclusion</h2>
              <p className="mt-1 text-sm text-slate-500">
                Temporarily lock yourself out of the platform. You will not be able to log in, deposit, or place predictions during this period. <strong className="text-amber-500">This cannot be reversed early.</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXCLUSIONS.map(e => (
                <button
                  key={e.days}
                  onClick={() => { setExcludeDays(e.days); setConfirmExclude(false) }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                    excludeDays === e.days
                      ? 'border-red-700/60 bg-red-900/20 text-red-400'
                      : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
            {excludeDays && !confirmExclude && (
              <button
                onClick={() => setConfirmExclude(true)}
                className="w-full rounded-xl border border-red-800/50 bg-red-900/10 py-3 text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors"
              >
                Exclude myself for {EXCLUSIONS.find(e => e.days === excludeDays)?.label}
              </button>
            )}
            {confirmExclude && (
              <div className="rounded-xl border border-red-700/60 bg-red-900/15 p-4 space-y-3">
                <p className="text-sm font-bold text-red-300">⚠️ Are you absolutely sure?</p>
                <p className="text-xs text-slate-400">
                  You will be signed out immediately and locked out until{' '}
                  <strong>{new Date(Date.now() + (excludeDays ?? 0) * 86400000).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                  This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={applySelfExclusion}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Applying…' : 'Yes, exclude me'}
                  </button>
                  <button
                    onClick={() => { setConfirmExclude(false); setExcludeDays(null) }}
                    className="flex-1 rounded-xl border border-[#2a2a3e] py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help resources */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5 text-sm text-slate-500 space-y-1">
          <p className="font-bold text-slate-400">Need help?</p>
          <p>Gambling should be fun. If you feel it is affecting your life, please reach out:</p>
          <p>• Uganda: <strong className="text-slate-300">Mental Health Uganda</strong> — 0800 222 177 (toll-free)</p>
          <p>• Email us at <a href="mailto:support@sabula256.com" className="text-violet-400 hover:text-violet-300">support@sabula256.com</a> to request account closure.</p>
        </div>

      </div>
    </div>
  )
}
