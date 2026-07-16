'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { StaffRole } from '@/lib/admin-roles'
import { ROLE_ALLOWED_PATHS } from '@/lib/admin-roles'

type NavItem = { href: string; icon: string; label: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin',             icon: '◈',  label: 'Dashboard'  },
      { href: '/admin/analytics',   icon: '📊', label: 'Analytics'  },
      { href: '/admin/proposals',   icon: '💡', label: 'Proposals'  },
      { href: '/admin/updown',      icon: '📈', label: 'Up/Down'    },
    ],
  },
  {
    label: 'Markets',
    items: [
      { href: '/admin/markets',      icon: '🏪', label: 'Markets' },
      { href: '/admin/settle-queue', icon: '⏳', label: 'Settle Queue' },
      { href: '/admin/auto-create',  icon: '⚡', label: 'Auto-Create' },
      { href: '/admin/bets',         icon: '🎯', label: 'Active Bets' },
      { href: '/admin/payouts',      icon: '🏆', label: 'Payouts' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/admin/users',       icon: '👥', label: 'Users' },
      { href: '/admin/kyc',         icon: '🪪', label: 'KYC Reviews' },
      { href: '/admin/support',     icon: '💬', label: 'Support' },
      { href: '/admin/notify',      icon: '📢', label: 'Notifications' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/activity',    icon: '📂', label: 'Activity' },
      { href: '/admin/transactions',icon: '💳', label: 'Transactions' },
      { href: '/admin/withdrawals', icon: '💸', label: 'Withdrawals' },
      { href: '/admin/funds',       icon: '🏦', label: 'Funds & Rake' },
      { href: '/admin/aml',         icon: '🚨', label: 'AML Monitoring' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/market-events',  icon: '⚡', label: 'Market Events' },
      { href: '/admin/community',      icon: '🌍', label: 'Community Review' },
      { href: '/admin/account-flags',  icon: '🚩', label: 'Account Flags' },
      { href: '/admin/flags',          icon: '🏴', label: 'Market Disputes' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/news',        icon: '📰', label: 'News Posts' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/settings',    icon: '⚙️', label: 'Settings' },
      { href: '/admin/audit',       icon: '🔍', label: 'Audit Log' },
      { href: '/admin/banned-ips',  icon: '🚫', label: 'IP Bans' },
      { href: '/admin/staff-roles', icon: '👔', label: 'Staff Roles' },
    ],
  },
]

function filterGroups(groups: NavGroup[], isSuperAdmin: boolean, role: StaffRole | null): NavGroup[] {
  if (isSuperAdmin) return groups
  if (!role) return []
  const allowed = new Set(ROLE_ALLOWED_PATHS[role])
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => allowed.has(i.href)) }))
    .filter(g => g.items.length > 0)
}

const ROLE_LABELS: Record<StaffRole, string> = {
  moderator: 'MODERATOR',
  settler:   'SETTLER',
  support:   'SUPPORT',
  analyst:   'ANALYST',
  content:   'CONTENT MGR',
}

export default function AdminSidebar({
  adminPhone,
  floatBalance,
  isSuperAdmin,
  staffRole,
  userId,
  currentSessionId,
}: {
  adminPhone: string
  floatBalance: number
  isSuperAdmin: boolean
  staffRole: string | null
  userId: string
  currentSessionId: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const role = (staffRole ?? null) as StaffRole | null
  const visibleGroups = filterGroups(NAV_GROUPS, isSuperAdmin, role)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState({ withdrawals: 0, kyc: 0, complaints: 0, settleQueue: 0, pendingApproval: 0 })
  const [float, setFloat] = useState(floatBalance)

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    async function fetchCounts() {
      const [w, k, c, sq, pa] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('markets').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('markets').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      ])
      setBadges({ withdrawals: w.count ?? 0, kyc: k.count ?? 0, complaints: c.count ?? 0, settleQueue: sq.count ?? 0, pendingApproval: pa.count ?? 0 })
    }
    fetchCounts()

    const ch = supabase.channel('admin-sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, fetchCounts)
      .subscribe()

    async function refreshFloat() {
      if (!isSuperAdmin) return
      const res = await fetch('/api/admin/marz-stats')
      if (!res.ok) return
      const data = await res.json()
      const available = data?.balance?.available
      if (typeof available === 'number') setFloat(available)
    }
    refreshFloat()
    const floatInterval = setInterval(refreshFloat, 30_000)

    return () => { supabase.removeChannel(ch); clearInterval(floatInterval) }
  }, [])

  // Single-device enforcement: watch our own profile row. If admin_session_id
  // changes (another device completed TOTP), sign out this session immediately.
  useEffect(() => {
    if (!currentSessionId) return
    const sessionCh = supabase
      .channel('admin-session-guard')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const newSessionId = (payload.new as Record<string, unknown>)?.admin_session_id
          if (newSessionId && newSessionId !== currentSessionId) {
            supabase.auth.signOut().then(() => router.push('/auth'))
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(sessionCh) }
  }, [userId, currentSessionId])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const roleLabel = isSuperAdmin ? 'SUPER ADMIN' : (role ? ROLE_LABELS[role] : 'STAFF')

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-[#0a0a12] border-b border-[#1a1a28] flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:bg-[#1a1a28] hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white shadow-lg shadow-red-900/50">
            A
          </div>
          <div>
            <p className="text-xs font-black text-white leading-none">Sabula 256</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-500 mt-0.5">Control Panel</p>
          </div>
        </div>

        <div className="ml-auto">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
            isSuperAdmin ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'
          }`}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-screen w-60 flex flex-col border-r border-[#1a1a28] bg-[#0a0a12]
        transition-transform duration-300 ease-in-out
        z-50 lg:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo + mobile close */}
        <div className="px-5 py-5 border-b border-[#1a1a28]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white shadow-lg shadow-red-900/50 flex-shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-none">Sabula 256</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mt-0.5">Control Panel</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-[#1a1a28] transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {visibleGroups.map(group => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[9px] font-black uppercase tracking-widest text-slate-700">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, icon, label }) => {
                  const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
                  const badge =
                    href === '/admin/withdrawals'  ? badges.withdrawals    :
                    href === '/admin/kyc'          ? badges.kyc            :
                    href === '/admin/support'      ? badges.complaints      :
                    href === '/admin/settle-queue' ? badges.settleQueue    :
                    href === '/admin/community'    ? badges.pendingApproval : 0
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-red-600/20 text-red-400 border border-red-800/40'
                          : 'text-slate-400 hover:bg-[#1a1a28] hover:text-white'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{icon}</span>
                      <span className="flex-1">{label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white leading-none">
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#1a1a28] px-4 py-4 space-y-3">
          {isSuperAdmin && (
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5">
              <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">Float Account</p>
              <p className="text-base font-black text-emerald-400 mt-0.5 tabular-nums">
                UGX {float.toLocaleString()}
              </p>
            </div>
          )}
          <div className="rounded-xl bg-[#1a1a28] px-3 py-2.5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Logged in as</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">+{adminPhone}</p>
            <p className={`text-[10px] font-bold mt-0.5 ${isSuperAdmin ? 'text-red-500' : 'text-amber-500'}`}>
              {roleLabel}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-xl border border-[#1a1a28] py-2 text-xs font-semibold text-slate-500 hover:border-red-800/50 hover:text-red-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
