'use client'
import { useState, useEffect } from 'react'

interface Settings {
  rake_percent: number
  min_bet: number
  max_bet: number
  min_deposit: number
  min_withdrawal: number
  platform_status: 'open' | 'maintenance' | 'readonly'
  maintenance_message: string
}

const DEFAULTS: Settings = {
  rake_percent: 8,
  min_bet: 1000,
  max_bet: 5000000,
  min_deposit: 2000,
  min_withdrawal: 5000,
  platform_status: 'open',
  maintenance_message: 'Platform under maintenance. Back shortly.',
}

export default function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          rake_percent:        Number(data.rake_percent        ?? DEFAULTS.rake_percent),
          min_bet:             Number(data.min_bet             ?? DEFAULTS.min_bet),
          max_bet:             Number(data.max_bet             ?? DEFAULTS.max_bet),
          min_deposit:         Number(data.min_deposit         ?? DEFAULTS.min_deposit),
          min_withdrawal:      Number(data.min_withdrawal      ?? DEFAULTS.min_withdrawal),
          platform_status:     (data.platform_status          ?? DEFAULTS.platform_status) as Settings['platform_status'],
          maintenance_message: data.maintenance_message        ?? DEFAULTS.maintenance_message,
        })
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) setSaved(true)
    else setError((await res.json()).error ?? 'Failed to save')
    setLoading(false)
  }

  const STATUS_OPTIONS: { value: Settings['platform_status']; label: string; color: string }[] = [
    { value: 'open',        label: 'Open — fully operational',         color: '#34d399' },
    { value: 'readonly',    label: 'Read-only — no new bets/deposits', color: '#fbbf24' },
    { value: 'maintenance', label: 'Maintenance — show banner',        color: '#f87171' },
  ]

  if (fetching) {
    return (
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <span className="animate-spin">◌</span> Loading settings…
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      {/* Platform status */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-1 font-black text-slate-200">Platform Status</h2>
        <p className="mb-5 text-xs text-slate-600">Controls whether users can place bets and deposit funds.</p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 rounded-xl border border-[#1a1a28] px-4 py-3.5 cursor-pointer hover:bg-[#111120] transition-colors" style={settings.platform_status === opt.value ? { borderColor: `${opt.color}40`, background: `${opt.color}08` } : {}}>
              <input
                type="radio"
                name="platform_status"
                value={opt.value}
                checked={settings.platform_status === opt.value}
                onChange={() => update('platform_status', opt.value)}
                className="accent-red-600"
              />
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ background: opt.color }} />
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {settings.platform_status === 'maintenance' && (
          <div className="mt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Maintenance Message</label>
            <input
              value={settings.maintenance_message}
              onChange={e => update('maintenance_message', e.target.value)}
              className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Rake */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-1 font-black text-slate-200">Rake / Commission</h2>
        <p className="mb-5 text-xs text-slate-600">Percentage taken from each settled pool before distributing winnings.</p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0} max={20} step={0.5}
            value={settings.rake_percent}
            onChange={e => update('rake_percent', Number(e.target.value))}
            className="flex-1 accent-red-600"
          />
          <div className="rounded-xl bg-[#1a1a28] px-5 py-3 text-center min-w-[72px]">
            <p className="text-2xl font-black text-red-400">{settings.rake_percent}%</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-600">Current: {settings.rake_percent}% of pool taken as rake on settlement</p>
      </div>

      {/* Betting limits */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-1 font-black text-slate-200">Betting Limits</h2>
        <p className="mb-5 text-xs text-slate-600">Minimum and maximum allowed bet per placement (UGX).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['min_bet', 'Minimum Bet'], ['max_bet', 'Maximum Bet']] as [keyof Settings, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{label} (UGX)</label>
              <input
                type="number"
                value={settings[key] as number}
                onChange={e => update(key, Number(e.target.value))}
                min={0}
                className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Deposit / withdrawal limits */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-1 font-black text-slate-200">Deposit & Withdrawal Limits</h2>
        <p className="mb-5 text-xs text-slate-600">Minimum transaction amounts (UGX).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['min_deposit', 'Minimum Deposit'], ['min_withdrawal', 'Minimum Withdrawal']] as [keyof Settings, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{label} (UGX)</label>
              <input
                type="number"
                value={settings[key] as number}
                onChange={e => update(key, Number(e.target.value))}
                min={0}
                className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && (
        <div className="rounded-xl bg-emerald-900/20 border border-emerald-800/30 px-4 py-3">
          <p className="text-sm font-bold text-emerald-400">✓ Settings saved successfully</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-red-700 py-4 text-sm font-black hover:bg-red-600 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}
