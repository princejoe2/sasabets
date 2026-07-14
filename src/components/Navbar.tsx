'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import ThemeToggle from '@/components/ThemeToggle'
import { SabulaNavLogo } from '@/components/SabulaLogo'

export default function Navbar() {
  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()
  const menuRef  = useRef<HTMLDivElement>(null)

  const [user,       setUser]       = useState<User | null>(null)
  const [wallet,     setWallet]     = useState<number | null>(null)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifSeen,  setNotifSeen]  = useState<string | null>(null)

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
        (payload) => { if (payload.new?.balance !== undefined) setWallet(Number(payload.new.balance)) }
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
    <nav className="sticky top-0 z-40 border-b border-emerald-200/70 bg-white/96 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#0d0d14]/92">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <SabulaNavLogo />
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/create"
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-black transition-all duration-150 ${
              isActive('/create')
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 dark:bg-[#00ff88] dark:text-[#040c06] dark:shadow-[#00ff88]/20'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 dark:bg-[#00ff88]/10 dark:text-[#00ff88]/80 dark:hover:bg-[#00ff88]/15 dark:hover:text-[#00ff88]'
            }`}
          >
            <span className="text-base leading-none">＋</span> Create
          </Link>
          {[
            { href: '/markets',     label: 'Markets'     },
            { href: '/leaderboard', label: '🏆 Leaderboard' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
                isActive(href)
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-white/[0.08] dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/90'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-1.5">

            {/* Balance chip — vivid green in light mode */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-500 px-3.5 py-1.5 shadow-sm shadow-emerald-400/30 dark:bg-white/[0.05] dark:shadow-none">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white dark:bg-emerald-400 shrink-0" />
              <span className="text-sm font-bold tabular-nums text-white dark:text-slate-200">
                {firstName && <span className="text-emerald-100 font-medium dark:text-white/35">{firstName} · </span>}
                {wallet !== null ? `UGX ${wallet.toLocaleString()}` : <span className="text-emerald-200 dark:text-white/20">…</span>}
              </span>
            </div>

            {/* Notification bell */}
            <Link
              href="/wallet"
              onClick={() => {
                const now = new Date().toISOString()
                localStorage.setItem(`notif-seen-${user?.id}`, now)
                setNotifSeen(now)
                setNotifCount(0)
              }}
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition-all duration-150 hover:bg-emerald-100 hover:text-emerald-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/80"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </Link>

            <ThemeToggle />

            {/* Deposit CTA */}
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-sm font-black text-white shadow-md shadow-emerald-500/25 transition-all duration-150 hover:bg-emerald-500 active:scale-95 dark:bg-[#00ff88] dark:text-[#040c06] dark:shadow-[#00ff88]/20 dark:hover:bg-[#00e07a]"
            >
              <span className="text-sm font-black leading-none">+</span>
              <span className="hidden sm:inline">Deposit</span>
            </Link>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                  menuOpen
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-white/10 dark:text-white'
                    : 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/80'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-900/10 dark:border-white/[0.07] dark:bg-[#111118] dark:shadow-black/60"
                  style={{ animation: 'menuIn 0.14s ease-out both' }}
                >
                  {/* Header */}
                  <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 dark:border-white/[0.05] dark:from-[#00ff88]/5 dark:to-transparent">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 dark:text-white/30">Account</p>
                    {fullName
                      ? <p className="mt-0.5 text-[15px] font-black text-slate-900 dark:text-white">{fullName}</p>
                      : <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">{phone}</p>
                    }
                    {fullName && <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">{phone}</p>}
                    <div className="mt-2 flex items-center gap-1.5 sm:hidden">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-[#00ff88]">
                        UGX {wallet !== null ? wallet.toLocaleString() : '…'}
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    {[
                      { href: '/wallet',    icon: '💳', label: 'Wallet',            sub: wallet !== null ? `UGX ${wallet.toLocaleString()}` : undefined },
                      { href: '/bets',      icon: '🎯', label: 'My Predictions',    sub: undefined as string | undefined },
                      { href: '/dashboard', icon: '🏗️', label: 'Creator Dashboard', sub: undefined as string | undefined },
                      { href: '/invite',    icon: '🎁', label: 'Invite & Earn',     sub: undefined as string | undefined },
                      { href: '/profile',   icon: '👤', label: 'Profile',           sub: undefined as string | undefined },
                      ...(user?.email === 'taskmastersug@gmail.com' ? [{ href: '/admin/analytics', icon: '📊', label: 'Admin Dashboard', sub: undefined as string | undefined }] : []),
                    ].map(({ href, icon, label, sub }) => {
                      const active = pathname === href
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2 text-sm transition-colors duration-100 ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 font-bold dark:bg-[#00ff88]/10 dark:text-[#00ff88]'
                              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-white/55 dark:hover:bg-white/[0.04] dark:hover:text-white'
                          }`}
                        >
                          <span className="text-sm">{icon}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold truncate">{label}</span>
                            {sub && <span className="block text-[11px] font-bold text-emerald-600 dark:text-[#00ff88]">{sub}</span>}
                          </span>
                          {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-[#00ff88]" />}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="border-t border-emerald-100 dark:border-white/[0.05]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-sm font-semibold text-red-500 transition-colors duration-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
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
              className="hidden sm:inline-flex rounded-full border-2 border-emerald-400 px-4 py-1.5 text-sm font-bold text-emerald-700 transition-all duration-150 hover:bg-emerald-50 hover:border-emerald-500 dark:border-white/10 dark:text-white/55 dark:hover:border-white/20 dark:hover:text-white/90"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-black text-white shadow-md shadow-emerald-500/30 transition-all duration-150 hover:bg-emerald-500 active:scale-95 dark:bg-[#00ff88] dark:text-[#040c06] dark:shadow-[#00ff88]/20 dark:hover:bg-[#00e07a]"
            >
              Sign up
            </Link>
          </div>
        )}

      </div>
    </nav>
  )
}
