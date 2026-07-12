'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>
  )
}

function MarketsIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )
}

function BetsIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  )
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
    </svg>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const seen = localStorage.getItem(`notif-seen-${user.id}`)
      const q = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .in('type', ['deposit', 'payout', 'cashout', 'referral_bonus'])
      if (seen) q.gt('created_at', seen)
      q.then(({ count }) => setNotifCount(count ?? 0))
    })
  }, [pathname])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const leftTabs  = [
    { href: '/',        Icon: HomeIcon,    label: 'Home'    },
    { href: '/markets', Icon: MarketsIcon, label: 'Markets' },
  ]
  const rightTabs = [
    { href: '/bets',   Icon: BetsIcon,   label: 'My Bets' },
    { href: '/wallet', Icon: WalletIcon, label: 'Wallet'  },
  ]

  const createActive = pathname.startsWith('/create')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t-2 border-emerald-200/70 bg-white/[0.97] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-[#0d0d14]/96"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {leftTabs.map(({ href, Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-90 ${
                active
                  ? 'text-emerald-600 dark:text-[#00ff88]'
                  : 'text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60'
              }`}
            >
              {/* Active top line */}
              {active && (
                <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] dark:bg-[#00ff88] dark:shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              )}
              {/* Active bg highlight */}
              {active && (
                <span className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-emerald-50 dark:bg-[#00ff88]/[0.07]" />
              )}
              <span className="relative z-10">
                <Icon active={active} />
              </span>
              <span className={`relative z-10 text-[10px] font-bold transition-all duration-150 ${active ? 'text-emerald-700 dark:text-[#00ff88]' : 'opacity-60'}`}>{label}</span>
            </Link>
          )
        })}

        {/* Centre create button */}
        <Link href="/create"
          className="relative flex flex-col items-center justify-center px-5 active:scale-90 transition-all duration-150"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
              createActive
                ? 'bg-emerald-600 shadow-[0_0_22px_rgba(16,185,129,0.55)] dark:bg-[#00ff88] dark:shadow-[0_0_22px_rgba(0,255,136,0.55)]'
                : 'bg-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_0_22px_rgba(16,185,129,0.55)] dark:bg-[#00e07a] dark:shadow-[0_4px_16px_rgba(0,255,136,0.3)] dark:hover:bg-[#00ff88]'
            }`}
            style={{ marginTop: '-18px' }}
          >
            <svg className="h-6 w-6 text-white dark:text-[#040c06]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <span className={`mt-1 text-[10px] font-bold transition-colors duration-150 ${createActive ? 'text-emerald-700 dark:text-[#00ff88]' : 'text-slate-400 dark:text-white/30'}`}>Create</span>
        </Link>

        {rightTabs.map(({ href, Icon, label }) => {
          const active   = isActive(href)
          const isWallet = href === '/wallet'
          return (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-90 ${
                active
                  ? 'text-emerald-600 dark:text-[#00ff88]'
                  : 'text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] dark:bg-[#00ff88] dark:shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              )}
              {active && (
                <span className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-emerald-50 dark:bg-[#00ff88]/[0.07]" />
              )}
              <span className="relative z-10">
                <div className="relative">
                  <Icon active={active} />
                  {isWallet && notifCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0d0d14]" />
                  )}
                </div>
              </span>
              <span className={`relative z-10 text-[10px] font-bold transition-all duration-150 ${active ? 'text-emerald-700 dark:text-[#00ff88]' : 'opacity-60'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
