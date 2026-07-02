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
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {leftTabs.map(({ href, Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-violet-500" />}
              <Icon active={active} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          )
        })}

        {/* Centre create button */}
        <Link href="/create"
          className="relative flex flex-col items-center justify-center px-5 -mt-4"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${
            createActive
              ? 'bg-violet-500 shadow-violet-500/40'
              : 'bg-violet-600 shadow-violet-600/30 hover:bg-violet-500'
          }`}>
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <span className={`mt-1 text-[10px] font-black ${createActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>Create</span>
        </Link>

        {rightTabs.map(({ href, Icon, label }) => {
          const active   = isActive(href)
          const isWallet = href === '/wallet'
          return (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-violet-500" />}
              <div className="relative">
                <Icon active={active} />
                {isWallet && notifCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
