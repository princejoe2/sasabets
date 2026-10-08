'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SabulaNavLogo } from '@/components/SabulaLogo'

// ─── Category definitions ─────────────────────────────────────────────────────

type Cat = { label: string; href: string; hot?: boolean } | { divider: true }

const CATS: Cat[] = [
  { label: '🔥 Hot', href: '/?cat=hot', hot: true },
  { label: 'New',    href: '/?cat=new' },
  { divider: true },
  { label: 'Politics',       href: '/?cat=politics'      },
  { label: 'Football',       href: '/?cat=football'      },
  { label: 'Economy',        href: '/?cat=economy'       },
  { label: 'Entertainment',  href: '/?cat=entertainment' },
  { label: 'Technology',     href: '/?cat=tech'          },
  { label: 'Infrastructure', href: '/?cat=infrastructure'},
  { label: 'Agriculture',    href: '/?cat=agriculture'   },
]

function CategoryRow({ activeCat }: { activeCat: string }) {
  function isActive(href: string) {
    try { return activeCat === new URL(href, 'http://x').searchParams.get('cat') } catch { return false }
  }
  return (
    <>
      {CATS.map((cat, i) => {
        if ('divider' in cat) {
          return <div key={i} className="h-4 w-px bg-mk-border mx-2 shrink-0" />
        }
        const active = isActive(cat.href)
        return (
          <Link
            key={cat.href}
            href={cat.href}
            className={[
              'relative shrink-0 snap-start px-3 py-1 text-sm font-bold rounded-r-pill whitespace-nowrap transition-all duration-150',
              active
                ? 'text-white'
                : cat.hot
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-mk-muted hover:text-mk-secondary',
            ].join(' ')}
          >
            {cat.label}
            {/* Accent underline when active */}
            {active && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-mk-accent" />
            )}
            {/* Red glow for Hot when active */}
            {active && cat.hot && (
              <span className="absolute inset-0 rounded-r-pill" style={{ boxShadow: '0 0 12px rgba(239,68,68,0.25)' }} />
            )}
          </Link>
        )
      })}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Navbar() {
  const supabase  = createClient()
  const router    = useRouter()
  const pathname  = usePathname()
  const menuRef   = useRef<HTMLDivElement>(null)
  const notifSeen = useRef<string | null>(null)

  const [user,       setUser]       = useState<User | null>(null)
  const [wallet,     setWallet]     = useState<number | null>(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [activeCat,  setActiveCat]  = useState('')
  const [search,     setSearch]     = useState('')
  const [notifCount, setNotifCount] = useState(0)

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchWallet(session.user.id)
      else setWallet(null)
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh wallet on route change
  useEffect(() => {
    if (user) fetchWallet(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user])

  // Derive active category from URL — runs client-side only
  useEffect(() => {
    setActiveCat(new URLSearchParams(window.location.search).get('cat') ?? '')
  }, [pathname])

  // Realtime: wallet balance + notification count
  useEffect(() => {
    if (!user) return
    const seen = localStorage.getItem(`notif-seen-${user.id}`)
    notifSeen.current = seen

    async function countNotifs(afterTs: string | null) {
      const q = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .in('type', ['deposit', 'payout', 'cashout', 'referral_bonus'])
      if (afterTs) q.gt('created_at', afterTs)
      const { count } = await q
      setNotifCount(count ?? 0)
    }
    countNotifs(seen)

    const channel = supabase
      .channel(`navbar-${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => { if (payload.new?.balance !== undefined) setWallet(Number(payload.new.balance)) },
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => countNotifs(notifSeen.current),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onOut(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [menuOpen])

  // Close dropdown on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function fetchWallet(userId: string) {
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
    if (data) setWallet(Number(data.balance))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (q) { router.push(`/markets?q=${encodeURIComponent(q)}`); setSearch('') }
  }

  function clearNotifs() {
    const now = new Date().toISOString()
    localStorage.setItem(`notif-seen-${user?.id}`, now)
    notifSeen.current = now
    setNotifCount(0)
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? ''
  const phone    = user?.phone ?? user?.email ?? ''
  const initials = (fullName || phone)
    .split(/[\s@]/).filter(Boolean)
    .map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const isAdmin = user?.email === 'taskmastersug@gmail.com'

  const menuItems = [
    { href: '/wallet',   icon: '💳', label: 'Wallet',         sub: wallet !== null ? `UGX ${wallet.toLocaleString()}` : undefined },
    { href: '/bets',     icon: '🎯', label: 'My Predictions', sub: undefined as string | undefined },
    { href: '/settings', icon: '⚙️', label: 'Settings',       sub: undefined as string | undefined },
    ...(isAdmin ? [{ href: '/admin/analytics', icon: '📊', label: 'Admin', sub: undefined as string | undefined }] : []),
  ]

  return (
    <nav className="sticky top-0 z-sticky-header bg-mk-bg/95 backdrop-blur-sm border-b border-mk-border">

      {/* ── Main row ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 h-14">

        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center" aria-label="Sabula 256 home">
          <SabulaNavLogo />
        </Link>

        {/* Search field — desktop only */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xs ml-4">
          <div className="relative w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mk-muted pointer-events-none"
                 fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets…"
              className="w-full rounded-r-pill bg-mk-raised border border-mk-border pl-9 pr-4 py-2 text-sm text-mk-text placeholder:text-mk-muted focus:outline-none focus:border-mk-accent transition-colors"
            />
          </div>
        </form>

        {/* Category row — desktop inline */}
        <div className="hidden lg:flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide gap-0.5">
          <CategoryRow activeCat={activeCat} />
        </div>

        {/* ── Right side ── */}
        <div ref={menuRef} className="ml-auto flex items-center gap-2 shrink-0">

          {user ? (
            <>
              {/* Balance chip — sm+ */}
              <Link href="/wallet" onClick={clearNotifs}
                className="hidden sm:flex items-center gap-2 rounded-r-pill bg-mk-raised px-3 py-1.5 border border-mk-border hover:border-mk-accent/50 transition-colors"
              >
                <span className="relative h-1.5 w-1.5 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-mk-yes animate-ping opacity-75" />
                  <span className="relative block h-1.5 w-1.5 rounded-full bg-mk-yes" />
                </span>
                <span className="text-sm font-bold tabular-nums text-mk-text">
                  {wallet !== null ? `UGX ${wallet.toLocaleString()}` : <span className="text-mk-muted">…</span>}
                </span>
                {notifCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </Link>

              {/* Avatar button — desktop only (mobile uses hamburger) */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className={[
                  'hidden lg:flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition-colors',
                  menuOpen
                    ? 'border-mk-accent/70 bg-mk-accent/10 text-mk-accent'
                    : 'border-mk-border bg-mk-raised text-mk-secondary hover:border-mk-accent/50 hover:text-mk-text',
                ].join(' ')}
              >
                {initials}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-r-pill bg-mk-accent px-4 py-2 text-sm font-bold text-black hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="hidden sm:inline">Sign in to trade</span>
              <span className="sm:hidden">Sign in</span>
            </Link>
          )}

          {/* ≡ Hamburger — always visible on mobile */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
            className={[
              'lg:hidden flex h-9 w-9 items-center justify-center rounded-r-btn border transition-colors',
              menuOpen
                ? 'border-mk-accent/70 bg-mk-accent/10 text-mk-accent'
                : 'border-mk-border text-mk-muted hover:text-mk-text hover:border-mk-border',
            ].join(' ')}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* ── Dropdown menu ── */}
          {menuOpen && (
            <div
              className="absolute right-4 top-[57px] z-modal w-60 overflow-hidden rounded-r-card border border-mk-card-border bg-mk-card shadow-2xl shadow-black/60"
              style={{ animation: 'menuIn 0.14s ease-out both' }}
            >
              {user ? (
                <>
                  {/* Account header */}
                  <div className="px-4 py-3.5 border-b border-mk-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-mk-muted">Account</p>
                    <p className="mt-0.5 text-sm font-bold text-mk-text truncate">{fullName || phone}</p>
                    <p className="mt-1 text-xs font-bold tabular-nums" style={{ color: 'var(--mk-yes-text)' }}>
                      UGX {wallet !== null ? wallet.toLocaleString() : '…'}
                    </p>
                    {/* Mobile balance — shown only on sm- since chip is hidden sm- */}
                    {notifCount > 0 && (
                      <p className="sm:hidden mt-1 text-[11px] font-bold text-red-400">
                        {notifCount} new notification{notifCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {/* Nav items */}
                  <div className="py-1">
                    {menuItems.map(({ href, icon, label, sub }) => (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-mk-secondary hover:bg-mk-raised hover:text-mk-text transition-colors"
                      >
                        <span className="text-base leading-none">{icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block">{label}</span>
                          {sub && <span className="block text-[11px] font-bold" style={{ color: 'var(--mk-yes-text)' }}>{sub}</span>}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-mk-border">
                    <button onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-mk-raised transition-colors"
                    >
                      <span>🚪</span> Sign out
                    </button>
                  </div>
                </>
              ) : (
                /* Logged-out menu: nav links + sign in */
                <>
                  <div className="py-1">
                    {[
                      { href: '/markets',     label: 'Browse Markets'   },
                      { href: '/leaderboard', label: '🏆 Leaderboard'   },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-sm font-semibold text-mk-secondary hover:bg-mk-raised hover:text-mk-text transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-mk-border">
                    <Link href="/auth" onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm font-bold transition-colors hover:bg-mk-raised"
                      style={{ color: 'var(--mk-accent)' }}
                    >
                      Sign in / Register →
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Category row — mobile (below main row) ────────────────────────── */}
      <div className="lg:hidden flex items-center gap-0.5 overflow-x-auto scrollbar-hide px-4 pb-2.5 snap-x snap-mandatory">
        <CategoryRow activeCat={activeCat} />
      </div>
    </nav>
  )
}
