'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// NOTE: Requires a `notification_prefs jsonb` column on the public.profiles table.
// Until that migration is applied, updates will silently no-op (Supabase ignores
// unknown columns rather than throwing). Run:
//   alter table public.profiles add column notification_prefs jsonb;
// to activate persistence.

const PREFS = [
  { key: 'email_market_settled',  label: 'Market settled',       desc: 'When a market you bet on is settled' },
  { key: 'email_payout_received', label: 'Payout received',      desc: 'When your winnings are credited' },
  { key: 'email_market_closing',  label: 'Market closing soon',  desc: '24h before a market you bet on closes' },
  { key: 'email_deposit_confirmed', label: 'Deposit confirmed',  desc: 'When your deposit is processed' },
  { key: 'email_weekly_digest',   label: 'Weekly digest',        desc: 'Top markets and your performance each week' },
]

type Prefs = Record<string, boolean>

export default function NotificationPreferences() {
  const supabase = createClient()
  const [prefs,     setPrefs]     = useState<Prefs>({})
  const [saving,    setSaving]    = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserEmail(user.email ?? null)

      const { data } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user.id)
        .single()

      if (data?.notification_prefs) {
        setPrefs(data.notification_prefs as Prefs)
      } else {
        // Default: all enabled
        const defaults: Prefs = {}
        PREFS.forEach(p => { defaults[p.key] = true })
        setPrefs(defaults)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(key: string) {
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    setSaving(key)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: newPrefs })
        .eq('id', user.id)
      if (error) console.warn('[NotificationPreferences] Save failed:', error.message)
    }
    setSaving(null)
  }

  if (loading) return null

  return (
    <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-5 py-4">
        <h3 className="font-bold text-slate-200">Email notifications</h3>
        {userEmail
          ? <p className="mt-0.5 text-sm text-slate-500">Sent to {userEmail}</p>
          : <p className="mt-0.5 text-sm text-amber-500">Add an email address to receive notifications</p>
        }
      </div>

      {/* Toggle rows */}
      <div className="divide-y divide-[#1e1e2e]">
        {PREFS.map(p => (
          <div key={p.key} className="flex items-center gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200">{p.label}</p>
              <p className="text-xs text-slate-500">{p.desc}</p>
            </div>
            <button
              onClick={() => toggle(p.key)}
              disabled={saving === p.key}
              aria-label={`Toggle ${p.label}`}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                prefs[p.key] ? 'bg-violet-600' : 'bg-[#1e1e2e]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[p.key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
