import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings – Sabula 256' }

const SECTIONS = [
  {
    title: 'Account',
    rows: [
      {
        href:  '/profile',
        icon:  '👤',
        label: 'Profile',
        desc:  'Name, email, phone number and prediction stats',
      },
      {
        href:  '/profile',
        icon:  '🔐',
        label: 'Two-Factor Authentication',
        desc:  'Secure your account with a TOTP authenticator app',
      },
      {
        href:  '/profile',
        icon:  '🔔',
        label: 'Notifications',
        desc:  'Push alerts, WhatsApp market updates, email preferences',
      },
    ],
  },
  {
    title: 'Privacy & Safety',
    rows: [
      {
        href:  '/kyc',
        icon:  '🪪',
        label: 'Verify Identity',
        desc:  'Submit your ID to unlock higher withdrawal limits',
      },
      {
        href:  '/responsible-gambling',
        icon:  '🛡️',
        label: 'Responsible Gambling',
        desc:  'Set deposit limits or take a break with self-exclusion',
      },
    ],
  },
  {
    title: 'Support',
    rows: [
      {
        href:  '/help',
        icon:  '❓',
        label: 'Help & FAQ',
        desc:  'Answers to common questions about Sabula 256',
      },
      {
        href:  '/support',
        icon:  '💬',
        label: 'Contact Support',
        desc:  'Raise a complaint or get help from the team',
      },
      {
        href:  '/about',
        icon:  'ℹ️',
        label: 'About Sabula 256',
        desc:  'Learn how Sabula 256 works and our mission',
      },
    ],
  },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, kyc_status, totp_enabled').eq('id', user.id).single()
    : { data: null }

  const fullName = (profile?.full_name as string | null) ?? (user?.user_metadata?.full_name as string | undefined) ?? ''
  const initials = fullName
    ? fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const kycStatus = profile?.kyc_status as string | null
  const kycBadge  = kycStatus === 'approved'
    ? { label: 'Verified',     cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' }
    : kycStatus === 'pending'
    ? { label: 'Under review', cls: 'bg-amber-900/30  text-amber-400  border-amber-800/40'  }
    : null

  const twoFaEnabled = profile?.totp_enabled as boolean | null

  const badges: Record<string, { label: string; cls: string } | null> = {
    '/kyc':     kycBadge,
    '/profile': twoFaEnabled ? { label: '2FA on', cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' } : null,
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-violet-950/30 to-transparent px-4 py-10">
        <div className="mx-auto max-w-2xl flex items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-lg font-black text-white shadow-xl shadow-violet-900/40">
            {initials}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Settings</p>
            <h1 className="text-2xl font-black text-white mt-0.5">
              {fullName || user?.email || 'Account'}
            </h1>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-600 px-1">
              {section.title}
            </p>
            <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#13131a]">
              {section.rows.map((row, i) => {
                const badge = badges[row.href]
                return (
                  <Link
                    key={row.label}
                    href={row.href}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] ${
                      i < section.rows.length - 1 ? 'border-b border-[#1e1e2e]' : ''
                    }`}
                  >
                    <span className="text-xl shrink-0">{row.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{row.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{row.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {badge && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                      <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Legal links */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2 text-xs text-slate-700">
          <Link href="/terms"   className="hover:text-slate-500 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</Link>
          <Link href="/responsible-gambling" className="hover:text-slate-500 transition-colors">Responsible Gambling</Link>
        </div>
      </div>
    </div>
  )
}
