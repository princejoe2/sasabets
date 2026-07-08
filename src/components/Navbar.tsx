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
    <nav className="sticky top-0 z-40 border-b border-green-100/60 bg-white/95 backdrop-blur-xl dark:border-[rgba(0,255,136,0.12)] dark:bg-[rgba(4,12,6,0.92)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">

        {/* ── Logo ── */}
        <Link href="/" className="group flex shrink-0 items-center">
          <SabulaNavLogo />
        </Link>

        {/* ── Nav links (hidden on mobile — accessible via bottom nav) ── */}
        <div className="hidden sm:flex items-center gap-0.5">
          <Link
            href="/create"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-black transition-colors ${
              isActive('/create')
                ? 'bg-emerald-100 text-emerald-700 dark:bg-[rgba(0,255,136,0.12)] dark:text-[#00ff88]'
                : 'text-emerald-700 hover:bg-emerald-50 dark:text-[#00ff88] dark:hover:bg-[rgba(0,255,136,0.08)]'
            }`}
          >
            <span className="text-base leading-none">＋</span> Create
          </Link>
          <Link
            href="/markets"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isActive('/markets')
                ? 'bg-emerald-50 text-emerald-700 dark:bg-[rgba(0,255,136,0.08)] dark:text-[#00ff88]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[rgba(255,255,255,0.6)] dark:hover:bg-[rgba(0,255,136,0.06)] dark:hover:text-white'
            }`}
          >
            Markets
          </Link>
          <Link
            href="/leaderboard"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isActive('/leaderboard')
                ? 'bg-emerald-50 text-emerald-700 dark:bg-[rgba(0,255,136,0.08)] dark:text-[#00ff88]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[rgba(255,255,255,0.6)] dark:hover:bg-[rgba(0,255,136,0.06)] dark:hover:text-white'
            }`}
          >
            🏆 Leaderboard
          </Link>
        </div>

        {/* ── Right side ── */}
        {user ? (
          <div className="flex items-center gap-2">

            {/* Balance chip */}
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2 sm:flex dark:border-[rgba(0,255,136,0.18)] dark:bg-[rgba(0,255,136,0.05)]">
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
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/40 text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 dark:border-[rgba(0,255,136,0.18)] dark:bg-[rgba(0,255,136,0.05)] dark:text-[rgba(0,255,136,0.7)] dark:hover:border-[rgba(0,255,136,0.4)] dark:hover:text-[#00ff88]"
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
              className="btn-glow flex items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 sm:px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 dark:bg-[#00ff88] dark:text-[#040c06] dark:hover:bg-[#00e07a] dark:font-black"
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
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-[rgba(0,255,136,0.4)] dark:bg-[rgba(0,255,136,0.1)] dark:text-[#00ff88]'
                    : 'border-emerald-100 bg-emerald-50/40 text-emerald-700 hover:border-emerald-300 dark:border-[rgba(0,255,136,0.18)] dark:bg-[rgba(0,255,136,0.05)] dark:text-[rgba(0,255,136,0.7)] dark:hover:border-[rgba(0,255,136,0.4)]'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xl shadow-emerald-100/30 dark:border-[rgba(0,255,136,0.15)] dark:bg-[#040c06] dark:shadow-black/60">
                  {/* Header */}
                  <div className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50 to-transparent px-4 py-4 dark:border-[rgba(0,255,136,0.1)] dark:from-[rgba(0,255,136,0.06)]">
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
                      { href: '/dashboard',            icon: '🏗️', label: 'Creator Dashboard', sub: undefined as string | undefined },
                      { href: '/invite',               icon: '🎁', label: 'Invite & Earn',    sub: undefined as string | undefined },
                      { href: '/leaderboard',          icon: '🏆', label: 'Leaderboard',      sub: undefined as string | undefined },
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
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-[rgba(0,255,136,0.08)] dark:text-[#00ff88]'
                              : 'text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900 dark:text-[rgba(255,255,255,0.55)] dark:hover:bg-[rgba(0,255,136,0.05)] dark:hover:text-white'
                          }`}
                        >
                          <span className="text-base">{icon}</span>
                          <span className="flex-1">
                            <span className="block font-semibold">{label}</span>
                            {sub && <span className="block text-[11px] font-bold text-emerald-600 dark:text-[#00ff88]">{sub}</span>}
                          </span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-[#00ff88]" />}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="border-t border-emerald-50 dark:border-[rgba(0,255,136,0.1)]" />
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
              className="hidden sm:inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:text-emerald-800 dark:border-[rgba(0,255,136,0.2)] dark:bg-[rgba(0,255,136,0.05)] dark:text-[rgba(0,255,136,0.8)] dark:hover:border-[rgba(0,255,136,0.4)] dark:hover:text-[#00ff88]"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="btn-glow rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 dark:bg-[#00ff88] dark:text-[#040c06] dark:font-black dark:hover:bg-[#00e07a]"
            >
              Sign up
            </Link>
          </div>
        )}

      </div>
    </nav>
  )
}
