'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="m21 21-4.35-4.35" />
    </svg>
  )
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
      <circle cx="5"  cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function NavTab({
  href, label, children, active, onClick,
}: {
  href?: string; label: string; children: React.ReactNode; active: boolean; onClick?: () => void
}) {
  const cls = [
    'relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-90',
    active ? 'text-white' : 'text-mk-muted hover:text-mk-secondary',
  ].join(' ')

  const inner = (
    <>
      {active && (
        <span className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full"
              style={{ background: 'var(--mk-accent)' }} />
      )}
      <span className="relative z-10">{children}</span>
      <span className={[
        'relative z-10 text-[10px] font-bold transition-colors duration-150',
        active ? 'text-white' : 'opacity-50',
      ].join(' ')}>
        {label}
      </span>
    </>
  )

  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button className={cls} onClick={onClick}>{inner}</button>
}

// ─── More sheet content ───────────────────────────────────────────────────────

const MORE_LINKS = [
  { href: '/bets',        icon: '🎯', label: 'My Predictions' },
  { href: '/wallet',      icon: '💳', label: 'Wallet'         },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard'    },
  { href: '/settings',    icon: '⚙️', label: 'Settings'       },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()

  const [scrolledPast, setScrolledPast] = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)

  // Detect scroll past ~1 screen height → show back-to-top
  useEffect(() => {
    function onScroll() {
      setScrolledPast(window.scrollY > window.innerHeight * 0.85)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close "More" sheet on route change
  useEffect(() => { setMoreOpen(false) }, [pathname])

  // Lock body scroll when More sheet is open
  useEffect(() => {
    if (moreOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [moreOpen])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const createActive = isActive('/create')
  const moreActive   = ['/bets', '/wallet', '/leaderboard', '/settings'].some(h => pathname.startsWith(h))

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-bottom-nav sm:hidden border-t border-mk-border backdrop-blur-xl"
        style={{ background: 'rgba(0,0,0,0.96)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative flex items-stretch h-14">

          {/* Home */}
          <NavTab href="/" label="Home" active={isActive('/')}>
            <HomeIcon active={isActive('/')} />
          </NavTab>

          {/* Search */}
          <NavTab href="/markets" label="Search" active={isActive('/markets')}>
            <SearchIcon active={isActive('/markets')} />
          </NavTab>

          {/* Centre — Create / Back-to-top */}
          <div className="relative flex flex-col items-center justify-center px-4">

            {/* Create button — visible when NOT scrolled past threshold */}
            <Link
              href="/create"
              aria-label="Create market"
              className={[
                'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-250 active:scale-90',
                createActive
                  ? 'shadow-[0_0_22px_rgba(255,159,67,0.5)]'
                  : 'shadow-[0_4px_16px_rgba(255,159,67,0.3)] hover:shadow-[0_0_22px_rgba(255,159,67,0.5)]',
                scrolledPast ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100',
              ].join(' ')}
              style={{ background: 'var(--mk-accent)', marginTop: '-18px' }}
            >
              <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Link>
            <span className={[
              'text-[10px] font-bold mt-1 transition-all duration-250',
              createActive ? 'text-white' : 'text-mk-muted opacity-60',
              scrolledPast ? 'opacity-0' : '',
            ].join(' ')}>
              Create
            </span>

            {/* Back-to-top — overlays Create when scrolled */}
            <button
              onClick={scrollToTop}
              aria-label="Back to top"
              className={[
                'absolute flex items-center justify-center h-11 w-11 rounded-full text-black font-bold text-lg transition-all duration-250 active:scale-90',
                scrolledPast ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none',
              ].join(' ')}
              style={{ background: 'var(--mk-accent)', marginTop: '-18px', top: '50%', transform: scrolledPast ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.5)' }}
            >
              ↑
            </button>
          </div>

          {/* More */}
          <NavTab label="More" active={moreActive || moreOpen} onClick={() => setMoreOpen(o => !o)}>
            <MoreIcon active={moreActive || moreOpen} />
          </NavTab>

        </div>
      </nav>

      {/* ── More sheet ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              className="fixed inset-0 z-sheet-backdrop sm:hidden"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              className="fixed bottom-0 left-0 right-0 z-sheet sm:hidden"
              style={{
                background:         'var(--mk-card)',
                borderRadius:       '20px 20px 0 0',
                paddingBottom:      'env(safe-area-inset-bottom)',
                borderTop:          '1px solid var(--mk-card-border)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-mk-border" />
              </div>
              <p className="px-5 pt-1 pb-3 text-[10px] font-bold uppercase tracking-widest text-mk-muted">More</p>

              <div className="pb-4">
                {MORE_LINKS.map(({ href, icon, label }) => (
                  <Link key={href} href={href} onClick={() => setMoreOpen(false)}
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
