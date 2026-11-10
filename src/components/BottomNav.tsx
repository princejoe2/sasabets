'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BetsIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={active ? 2.1 : 1.75}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={active ? 2.1 : 1.75}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path strokeLinecap="round" d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" />
    </svg>
  )
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function NavTab({
  href, label, children, active, onClick, badge, labelClass,
}: {
  href?: string; label: React.ReactNode; children: React.ReactNode; active: boolean
  onClick?: () => void; badge?: number; labelClass?: string
}) {
  const cls = [
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-90',
    active ? 'text-white' : 'text-mk-muted',
  ].join(' ')

  const inner = (
    <>
      {active && (
        <span className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full"
              style={{ background: 'var(--mk-accent)' }} />
      )}
      <span className="relative z-10">
        {children}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-mk-no text-white text-[9px] font-black leading-4 text-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={[
        'relative z-10 max-w-full truncate px-1 text-[10px] font-bold transition-colors duration-150',
        labelClass ?? (active ? 'text-white' : 'opacity-60'),
      ].join(' ')}>
        {label}
      </span>
    </>
  )

  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" className={cls} onClick={onClick}>{inner}</button>
}

// ─── "Me" sheet content ───────────────────────────────────────────────────────

const ME_LINKS = [
  { href: '/profile',     icon: '👤', label: 'Profile'        },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard'    },
  { href: '/invite',      icon: '🎁', label: 'Invite & Earn'  },
  { href: '/settings',    icon: '⚙️', label: 'Settings'       },
]

function fmtBalance(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 10_000)    return `UGX ${Math.floor(n / 1000)}K`
  return `UGX ${Math.floor(n).toLocaleString()}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()

  const [user,     setUser]     = useState<User | null>(null)
  const [balance,  setBalance]  = useState<number | null>(null)
  const [settled,  setSettled]  = useState(0)     // total settled bets (won/lost/refunded)
  const [seen,     setSeen]     = useState(0)     // settled count when user last opened /bets
  const [meOpen,   setMeOpen]   = useState(false)

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Balance + settled-bets count, kept live via Realtime
  useEffect(() => {
    if (!user) { setBalance(null); setSettled(0); return }
    const uid = user.id

    try { setSeen(Number(localStorage.getItem(`bets-seen-${uid}`) ?? 0)) } catch {}

    async function loadBalance() {
      const { data } = await supabase.from('wallets').select('balance').eq('user_id', uid).single()
      if (data) setBalance(Number(data.balance))
    }
    async function loadSettled() {
      const { count } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .in('status', ['won', 'lost', 'refunded'])
      setSettled(count ?? 0)
    }
    loadBalance()
    loadSettled()

    const channel = supabase
      .channel(`bottomnav-${uid}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${uid}` },
        (payload) => { if (payload.new?.balance !== undefined) setBalance(Number(payload.new.balance)) },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bets', filter: `user_id=eq.${uid}` },
        () => loadSettled(),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Opening My Bets clears the badge
  useEffect(() => {
    if (!user || !pathname.startsWith('/bets')) return
    setSeen(settled)
    try { localStorage.setItem(`bets-seen-${user.id}`, String(settled)) } catch {}
  }, [pathname, settled, user])

  // Close sheet on route change
  useEffect(() => { setMeOpen(false) }, [pathname])

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!meOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [meOpen])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const meActive = ME_LINKS.some(l => pathname.startsWith(l.href))
  const badge    = Math.max(0, settled - seen)
  // Floating Create button only on browse pages — market pages have their own sticky trade bar
  const showFab  = pathname === '/' || pathname === '/markets'

  return (
    <>
      {/* ── Floating Create button ─────────────────────────────────────────── */}
      {showFab && (
        <Link
          href="/create"
          aria-label="Create a market"
          className="fixed right-4 z-bottom-nav sm:hidden flex h-14 w-14 items-center justify-center rounded-full text-black shadow-[0_4px_18px_rgba(255,159,67,0.45)] transition-transform active:scale-90"
          style={{ background: 'var(--mk-accent)', bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-bottom-nav sm:hidden border-t border-mk-border backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.96)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-14 items-stretch">
          <NavTab href="/" label="Home" active={isActive('/')}>
            <HomeIcon active={isActive('/')} />
          </NavTab>

          <NavTab href="/bets" label="My Bets" active={isActive('/bets')} badge={badge}>
            <BetsIcon active={isActive('/bets')} />
          </NavTab>

          <NavTab
            href="/wallet"
            active={isActive('/wallet')}
            label={user && balance !== null ? fmtBalance(balance) : 'Wallet'}
            labelClass={user && balance !== null ? 'text-mk-yes' : undefined}
          >
            <WalletIcon active={isActive('/wallet')} />
          </NavTab>

          <NavTab label="Me" active={meActive || meOpen} onClick={() => setMeOpen(o => !o)}>
            <MeIcon active={meActive || meOpen} />
          </NavTab>
        </div>
      </nav>

      {/* ── "Me" sheet ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {meOpen && (
          <>
            <motion.div
              key="me-backdrop"
              className="fixed inset-0 z-sheet-backdrop sm:hidden"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMeOpen(false)}
            />
            <motion.div
              key="me-sheet"
              className="fixed bottom-0 left-0 right-0 z-sheet sm:hidden"
              style={{
                background:    'var(--mk-card)',
                borderRadius:  '20px 20px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
                borderTop:     '1px solid var(--mk-card-border)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-mk-border" />
              </div>
              <p className="px-5 pt-1 pb-3 text-[10px] font-bold uppercase tracking-widest text-mk-muted">Me</p>

              <div className="pb-4">
                {(user ? ME_LINKS : [{ href: '/auth', icon: '🔑', label: 'Sign in / Sign up' }, ...ME_LINKS.slice(1, 2)]).map(({ href, icon, label }) => (
                  <Link key={href} href={href} onClick={() => setMeOpen(false)}
                    className={[
                      'flex items-center gap-4 px-5 py-4 text-sm font-semibold transition-colors',
                      pathname.startsWith(href)
                        ? 'text-white bg-mk-raised'
                        : 'text-mk-secondary hover:bg-mk-raised hover:text-mk-text',
                    ].join(' ')}
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="text-[15px]">{label}</span>
                    {pathname.startsWith(href) && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: 'var(--mk-accent)' }} />
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
