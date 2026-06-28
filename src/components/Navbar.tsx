'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import ThemeToggle from '@/components/ThemeToggle'

export default function Navbar() {
  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()
  const menuRef  = useRef<HTMLDivElement>(null)

  const [user,        setUser]        = useState<User | null>(null)
  const [wallet,      setWallet]      = useState<number | null>(null)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [notifCount,  setNotifCount]  = useState(0)
  const [notifSeen,   setNotifSeen]   = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchWallet(session.user.id)
      else setWallet(null)
    })
  }, [])

  useEffect(() => {
    if (user) fetchWallet(user.id)
  }, [pathname, user])

  useEffect(() => {
    if (!user) return

    const seen = localStorage.getItem(`notif-seen-${user.id}`)
    setNotifSeen(seen)

    async function countNew(afterTs: string | null) {
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
    countNew(seen)

    const channel = supabase
      .channel(`navbar-${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new?.balance !== undefined) setWallet(Number(payload.new.balance))
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => countNew(seen)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  async function fetchWallet(userId: string) {
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
    if (data) setWallet(Number(data.balance))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  const isActive  = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href)
  const phone     = user?.phone ?? ''
  const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? ''
  const firstName = fullName.split(' ')[0] || ''

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">

        {/* ── Logo ── */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-[17px] font-black text-white shadow-lg shadow-violet-200 transition-shadow group-hover:shadow-violet-300">
            S
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <span className="hidden text-xl font-black tracking-tight sm:block">
            <span className="text-violet-600">Sabula</span>
            <span className="text-slate-900 dark:text-white"> 256</span>
          </span>
        </Link>

        {/* ── Nav links (hidden on mobile — accessible via account menu) ── */}
        <div className="hidden sm:flex items-center gap-0.5">
          {([['Markets', '/markets'], ['Leaderboard', '/leaderboard']] as const).map(([label, href]) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* ── Right side ── */}
        {user ? (
          <div className="flex items-center gap-2">

            {/* Balance chip */}
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 sm:flex dark:border-slate-700 dark:bg-slate-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shrink-0" />
              <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                {firstName && <span className="text-slate-500 font-semibold">{firstName} · </span>}
                {wallet !== null
                  ? `UGX ${wallet.toLocaleString()}`
                  : <span className="text-slate-400">…</span>
                }
              </span>
            </div>

            {/* Notifications bell */}
            <Link
              href="/wallet"
              onClick={() => {
                const now = new Date().toISOString()
                localStorage.setItem(`notif-seen-${user?.id}`, now)
                setNotifSeen(now)
                setNotifCount(0)
              }}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:bg-violet-900/20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Deposit CTA */}
            <Link
              href="/wallet"
              className="btn-glow flex items-center gap-1.5 rounded-xl bg-violet-600 px-2.5 sm:px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              <span className="text-base font-black leading-none">+</span>
              <span className="hidden sm:inline">Deposit</span>
            </Link>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  menuOpen
                    ? 'border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
                  {/* Header */}
                  <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-transparent px-4 py-4 dark:border-slate-700 dark:from-violet-900/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Signed in as</p>
                    {fullName
                      ? <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white">{fullName}</p>
                      : <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">{phone}</p>
                    }
                    {fullName && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{phone}</p>}
                    <div className="mt-2.5 flex items-center gap-1.5 sm:hidden">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold text-emerald-600">
                        UGX {wallet !== null ? wallet.toLocaleString() : '…'}
                      </span>
                    </div>
                  </div>

                  {/* Nav links */}
                  <div className="py-1">
                    {[
                      { href: '/wallet',               icon: '💳', label: 'Wallet',           sub: wallet !== null ? `UGX ${wallet.toLocaleString()}` : undefined },
                      { href: '/bets',                 icon: '🎯', label: 'My Predictions',   sub: undefined as string | undefined },
                      { href: '/updown',               icon: '📈', label: 'Up/Down',          sub: undefined as string | undefined },
                      { href: '/proposals',            icon: '💡', label: 'Proposals',        sub: undefined as string | undefined },
                      { href: '/profile',              icon: '👤', label: 'Profile',          sub: undefined as string | undefined },
                      { href: '/kyc',                  icon: '🪪', label: 'Verify Identity',  sub: undefined as string | undefined },
                      { href: '/responsible-gambling', icon: '🛡️', label: 'Responsible Play', sub: undefined as string | undefined },
                      { href: '/help',                 icon: '❓', label: 'Help / FAQ',        sub: undefined as string | undefined },
                      { href: '/about',                icon: 'ℹ️', label: 'About Sabula 256',  sub: undefined as string | undefined },
                      ...(user?.email === 'taskmastersug@gmail.com' ? [{ href: '/admin/analytics', icon: '📊', label: 'Admin Dashboard', sub: undefined as string | undefined }] : []),
                    ].map(({ href, icon, label, sub }) => {
                      const active = pathname === href
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            active
                              ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <span className="text-base">{icon}</span>
                          <span className="flex-1">
                            <span className="block font-semibold">{label}</span>
                            {sub && <span className="block text-[11px] font-bold text-violet-600">{sub}</span>}
                          </span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth"
              className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:text-violet-400"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="btn-glow rounded-xl bg-violet-600 px-3.5 sm:px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Sign up
            </Link>
          </div>
        )}

      </div>
    </nav>
  )
}
