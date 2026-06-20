'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()
  const menuRef  = useRef<HTMLDivElement>(null)

  const [user,     setUser]     = useState<User | null>(null)
  const [wallet,   setWallet]   = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchWallet(session.user.id)
      else setWallet(null)
    })
  }, [])

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
    <nav className="sticky top-0 z-40 border-b border-[#1e1e2e] bg-[#0d0d14]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">

        {/* ── Logo ── */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-[17px] font-black text-white shadow-lg shadow-violet-900/50 transition-shadow group-hover:shadow-violet-700/70">
            S
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0d0d14] bg-emerald-400" />
          </div>
          <span className="hidden text-xl font-black tracking-tight sm:block">
            <span className="text-violet-400">Sabula</span>
            <span className="text-white"> 256</span>
          </span>
        </Link>

        {/* ── Nav links ── */}
        <div className="flex items-center gap-0.5">
          {([['Markets', '/markets'], ['Leaderboard', '/leaderboard']] as const).map(([label, href]) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-[#1e1e2e] text-white' : 'text-slate-400 hover:bg-[#1a1a28] hover:text-white'
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
            <div className="hidden items-center gap-2 rounded-xl border border-[#2a2a3e] bg-[#111118] px-3.5 py-2 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shrink-0" />
              <span className="text-sm font-bold tabular-nums text-slate-200">
                {firstName && <span className="text-slate-400 font-semibold">{firstName} · </span>}
                {wallet !== null
                  ? `UGX ${wallet.toLocaleString()}`
                  : <span className="text-slate-500">…</span>
                }
              </span>
            </div>

            {/* Deposit CTA */}
            <Link
              href="/wallet"
              className="btn-glow flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              <span className="text-base font-black leading-none">+</span>
              <span>Deposit</span>
            </Link>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  menuOpen
                    ? 'border-violet-600/70 bg-violet-900/30 text-violet-300'
                    : 'border-[#2a2a3e] bg-[#111118] text-slate-400 hover:border-violet-800/60 hover:text-white'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-[#2a2a3e] bg-[#111118] shadow-2xl shadow-black/70">
                  {/* Header */}
                  <div className="border-b border-[#1e1e2e] bg-gradient-to-r from-violet-900/25 to-transparent px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Signed in as</p>
                    {fullName
                      ? <p className="mt-0.5 text-base font-black text-white">{fullName}</p>
                      : <p className="mt-0.5 text-sm font-semibold text-slate-300">{phone}</p>
                    }
                    {fullName && <p className="text-xs text-slate-500 mt-0.5">{phone}</p>}
                    {/* mobile balance */}
                    <div className="mt-2.5 flex items-center gap-1.5 sm:hidden">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">
                        UGX {wallet !== null ? wallet.toLocaleString() : '…'}
                      </span>
                    </div>
                  </div>

                  {/* Nav links */}
                  <div className="py-1">
                    {[
                      { href: '/wallet',               icon: '💳', label: 'Wallet',           sub: wallet !== null ? `UGX ${wallet.toLocaleString()}` : undefined },
                      { href: '/bets',                 icon: '🎯', label: 'My Predictions',   sub: undefined },
                      { href: '/updown',               icon: '📈', label: 'Up/Down',          sub: undefined },
                      { href: '/proposals',            icon: '💡', label: 'Proposals',        sub: undefined },
                      { href: '/profile',              icon: '👤', label: 'Profile',          sub: undefined },
                      { href: '/kyc',                  icon: '🪪', label: 'Verify Identity',  sub: undefined },
                      { href: '/responsible-gambling', icon: '🛡️', label: 'Responsible Play', sub: undefined },
                    ].map(({ href, icon, label, sub }) => {
                      const active = pathname === href
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                            active ? 'bg-[#1e1e2e] text-white' : 'text-slate-400 hover:bg-[#181826] hover:text-white'
                          }`}
                        >
                          <span className="text-base">{icon}</span>
                          <span className="flex-1">
                            <span className="block font-semibold">{label}</span>
                            {sub && <span className="block text-[11px] font-bold text-violet-400">{sub}</span>}
                          </span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="border-t border-[#1e1e2e]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/30 hover:text-red-300"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth"
              className="rounded-xl border border-[#2a2a3e] bg-[#111118] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-violet-800/60 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/auth"
              className="btn-glow rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Sign up
            </Link>
          </div>
        )}

      </div>
    </nav>
  )
}
