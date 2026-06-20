'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  total: number; active: number; won: number; lost: number
  staked: number; paidOut: number
}

export default function ProfilePage() {
  const supabase = createClient()
  const router   = useRouter()

  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [balance,     setBalance]     = useState<number | null>(null)
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [memberSince, setMemberSince] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      setMemberSince(new Date(user.created_at).toLocaleDateString('en-UG', {
        day: 'numeric', month: 'long', year: 'numeric',
      }))

      const [{ data: profile }, { data: wallet }, { data: bets }, { data: txns }] = await Promise.all([
        supabase.from('profiles').select('phone, full_name').eq('id', user.id).single(),
        supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
        supabase.from('bets').select('amount, potential_payout, status').eq('user_id', user.id),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'payout').eq('status', 'completed'),
      ])

      if (profile?.full_name) setName(profile.full_name)
      else if (user.user_metadata?.full_name) setName(user.user_metadata.full_name as string)
      if (profile?.phone) setPhone(profile.phone)
      if (wallet) setBalance(Number(wallet.balance))

      if (bets) {
        const won    = bets.filter(b => b.status === 'won')
        const paidOut = txns?.reduce((s, t) => s + Number(t.amount), 0) ?? 0
        setStats({
          total:  bets.length,
          active: bets.filter(b => b.status === 'active').length,
          won:    won.length,
          lost:   bets.filter(b => b.status === 'lost').length,
          staked: bets.reduce((s, b) => s + Number(b.amount), 0),
          paidOut,
        })
      }
    }
    load()
  }, [])

  const netReturn = stats ? stats.paidOut - stats.staked : 0
  const winRate   = stats && (stats.won + stats.lost) > 0
    ? Math.round((stats.won / (stats.won + stats.lost)) * 100)
    : null

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Profile hero ── */}
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-violet-950/30 to-transparent px-4 py-10">
        <div className="mx-auto max-w-3xl flex items-center gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-xl font-black text-white shadow-xl shadow-violet-900/40">
            {initials}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Your account</p>
            <h1 className="text-3xl font-black text-white mt-0.5">
              {name || <span className="text-slate-500">Loading…</span>}
            </h1>
            {memberSince && (
              <p className="text-sm text-slate-500 mt-1">Member since {memberSince}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="grid gap-5 sm:grid-cols-2">

          {/* ── Account card ── */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6 space-y-5">
            <h2 className="font-bold text-slate-200">Account Details</h2>

            {/* Balance */}
            <div className="rounded-xl bg-[#0a0a0f] px-4 py-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">Wallet Balance</p>
              <p className="text-3xl font-black text-violet-400">
                {balance !== null ? `UGX ${balance.toLocaleString()}` : '—'}
              </p>
              <Link
                href="/wallet"
                className="mt-2 inline-block rounded-lg border border-violet-800/40 bg-violet-900/20 px-4 py-1.5 text-xs font-bold text-violet-400 hover:bg-violet-900/40 transition-colors"
              >
                Deposit / Withdraw →
              </Link>
            </div>

            {/* Name (read-only display) */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</p>
              <div className="flex items-center gap-3 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3">
                <span className="text-sm font-semibold text-slate-200">{name || '—'}</span>
              </div>
            </div>

            {/* Phone — locked, read-only */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Mobile Number</p>
              <div className="flex items-center justify-between rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3">
                <span className="text-sm text-slate-300">
                  {phone ? `+${phone}` : '—'}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  locked
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600">
                Your phone number is your login ID and cannot be changed.
              </p>
            </div>
          </div>

          {/* ── Stats card ── */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6 space-y-4">
            <h2 className="font-bold text-slate-200">
              {name ? `${name.split(' ')[0]}'s Stats` : 'Prediction Stats'}
            </h2>

            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: stats.total,  label: 'Predictions', color: 'text-slate-200'  },
                    { value: stats.active, label: 'Active',      color: 'text-sky-400'    },
                    { value: stats.won,    label: 'Won',         color: 'text-emerald-400' },
                    { value: stats.lost,   label: 'Lost',        color: 'text-red-400'    },
                  ].map(({ value, label, color }) => (
                    <div key={label} className="rounded-xl bg-[#0a0a0f] p-3 text-center">
                      <p className={`text-2xl font-black ${color}`}>{value}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {winRate !== null && (
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-500">Win rate</span>
                      <span className="font-bold text-emerald-400">{winRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#1e1e2e]">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all"
                        style={{ width: `${winRate}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-[#0a0a0f] p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total staked</span>
                    <span className="text-slate-300 font-semibold">UGX {stats.staked.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total paid out</span>
                    <span className="text-emerald-400 font-semibold">UGX {stats.paidOut.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-[#1e1e2e] pt-2 mt-1">
                    <span className="font-bold text-slate-400">Net P&amp;L</span>
                    <span className={`font-black ${netReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {netReturn >= 0 ? '+' : ''}UGX {Math.abs(netReturn).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-3xl">🎯</p>
                <p className="mt-3 text-sm text-slate-500">
                  {name ? `${name.split(' ')[0]} hasn't placed any predictions yet.` : 'No predictions yet.'}
                </p>
                <Link href="/markets" className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Browse markets →
                </Link>
              </div>
            )}

            <Link
              href="/bets"
              className="block w-full rounded-xl border border-[#1e1e2e] py-2.5 text-center text-sm font-semibold text-slate-400 hover:border-violet-700/50 hover:text-white transition-colors"
            >
              View all {name ? `${name.split(' ')[0]}'s` : 'my'} predictions →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
