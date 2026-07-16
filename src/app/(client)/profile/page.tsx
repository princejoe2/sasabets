'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ReferralCard from '@/components/ReferralCard'
import NotificationPreferences from '@/components/NotificationPreferences'
import AchievementBadges from '@/components/AchievementBadges'

interface Stats {
  total: number; active: number; won: number; lost: number
  staked: number; paidOut: number
}

export default function ProfilePage() {
  const supabase = createClient()
  const router   = useRouter()

  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [balance,     setBalance]     = useState<number | null>(null)
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [memberSince, setMemberSince] = useState('')
  const [has2fa,      setHas2fa]      = useState(false)
  const [streakDays,  setStreakDays]  = useState<number | null>(null)
  const [pushPermission,   setPushPermission]   = useState<NotificationPermission | 'unsupported' | null>(null)
  const [pushLoading,      setPushLoading]      = useState(false)
  const [userId,           setUserId]           = useState('')
  const [waOptedIn,        setWaOptedIn]        = useState(false)
  const [waLoading,        setWaLoading]        = useState(false)
  const [waMsg,            setWaMsg]            = useState<string | null>(null)

  // Phone add state (for Google OAuth users who have no phone yet)
  const [phoneInput,   setPhoneInput]   = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneMsg,     setPhoneMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  // 2FA management state
  const [show2faSetup,  setShow2faSetup]  = useState(false)
  const [show2faDisable, setShow2faDisable] = useState(false)
  const [qrDataUrl,     setQrDataUrl]     = useState('')
  const [setupCode,     setSetupCode]     = useState('')
  const [disableCode,   setDisableCode]   = useState('')
  const [twoFaLoading,  setTwoFaLoading]  = useState(false)
  const [twoFaMsg,      setTwoFaMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      setUserId(user.id)
      setEmail(user.email ?? '')

      // Push notification permission (browser API — no DB call needed for reading state)
      if ('Notification' in window) {
        setPushPermission(Notification.permission)
      } else {
        setPushPermission('unsupported')
      }
      setMemberSince(new Date(user.created_at).toLocaleDateString('en-UG', {
        day: 'numeric', month: 'long', year: 'numeric',
      }))

      const [{ data: profile }, { data: wallet }, { data: bets }, { data: txns }] = await Promise.all([
        supabase.from('profiles').select('phone, full_name, totp_enabled, streak_days, whatsapp_opted_in').eq('id', user.id).single(),
        supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
        supabase.from('bets').select('amount, potential_payout, status').eq('user_id', user.id),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'payout').eq('status', 'completed'),
      ])

      if (profile?.full_name) setName(profile.full_name)
      else if (user.user_metadata?.full_name) setName(user.user_metadata.full_name as string)
      if (profile?.phone)            setPhone(profile.phone)
      if (profile?.totp_enabled)     setHas2fa(true)
      if (profile?.whatsapp_opted_in) setWaOptedIn(true)
      if (wallet) setBalance(Number(wallet.balance))
      if (profile?.streak_days != null) setStreakDays(Number(profile.streak_days))

      if (bets) {
        const won     = bets.filter(b => b.status === 'won')
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

  // ── Phone (Google OAuth users) ──────────────────────────────────────────────

  async function savePhone() {
    const raw = phoneInput.replace(/[\s\-()]/g, '')
    if (!/^(\+256|256|0)(7\d{8}|39\d{7})$/.test(raw)) {
      setPhoneMsg({ text: 'Enter a valid Ugandan MTN or Airtel number', ok: false })
      return
    }
    setPhoneLoading(true); setPhoneMsg(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: raw }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPhoneMsg({ text: data.error ?? 'Failed to save', ok: false })
      setPhoneLoading(false)
      return
    }
    // Normalise and store locally so the page updates without a full reload
    let normalised = raw
    if (normalised.startsWith('0'))    normalised = '256' + normalised.slice(1)
    if (normalised.startsWith('+256')) normalised = normalised.slice(1)
    setPhone(normalised)
    setPhoneMsg({ text: 'Phone number saved!', ok: true })
    setPhoneInput('')
    setPhoneLoading(false)
  }

  // ── 2FA management ──────────────────────────────────────────────────────────

  async function start2faSetup() {
    setTwoFaLoading(true); setTwoFaMsg(null)
    const res = await fetch('/api/auth/2fa/setup')
    const data = await res.json()
    if (!res.ok) { setTwoFaMsg({ text: data.error ?? 'Failed', ok: false }); setTwoFaLoading(false); return }
    setQrDataUrl(data.qrDataUrl)
    setShow2faSetup(true)
    setSetupCode('')
    setTwoFaLoading(false)
  }

  async function confirm2faEnable() {
    if (setupCode.length !== 6) { setTwoFaMsg({ text: 'Enter the 6-digit code from your app', ok: false }); return }
    setTwoFaLoading(true); setTwoFaMsg(null)
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: setupCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setTwoFaMsg({ text: data.error ?? 'Invalid code', ok: false })
    } else {
      setHas2fa(true); setShow2faSetup(false)
      setTwoFaMsg({ text: '2FA enabled successfully.', ok: true })
    }
    setTwoFaLoading(false)
  }

  async function confirm2faDisable() {
    if (disableCode.length !== 6) { setTwoFaMsg({ text: 'Enter your current 6-digit code to confirm', ok: false }); return }
    setTwoFaLoading(true); setTwoFaMsg(null)
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: disableCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setTwoFaMsg({ text: data.error ?? 'Invalid code', ok: false })
    } else {
      setHas2fa(false); setShow2faDisable(false)
      setTwoFaMsg({ text: '2FA disabled.', ok: true })
    }
    setTwoFaLoading(false)
  }

  // ── Push notifications ──────────────────────────────────────────────────────

  async function requestPushPermission() {
    if (!('Notification' in window)) return
    setPushLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPushPermission(result)
      if (result === 'granted') {
        // Best-effort: store opt-in flag — silently ignore if push_enabled column doesn't exist
        try {
          await supabase.from('profiles').update({ push_enabled: true }).eq('id', userId)
        } catch {
          // Column may not exist yet — no-op
        }
      }
    } catch (err) {
      console.error('Push permission error:', err)
    }
    setPushLoading(false)
  }

  async function toggleWhatsappOptIn() {
    setWaLoading(true); setWaMsg(null)
    const next = !waOptedIn
    const { error } = await supabase
      .from('profiles')
      .update({ whatsapp_opted_in: next })
      .eq('id', userId)
    if (error) {
      setWaMsg('Failed to update preference.')
    } else {
      setWaOptedIn(next)
      setWaMsg(next ? 'You will receive WhatsApp alerts for featured markets.' : 'WhatsApp alerts disabled.')
    }
    setWaLoading(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">

        {/* ── Login Streak ── */}
        {streakDays != null && streakDays > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border border-orange-800/30 bg-gradient-to-r from-orange-950/30 to-amber-950/30 p-4">
            <span className="text-4xl">🔥</span>
            <div className="flex-1">
              <p className="text-2xl font-black text-orange-400">{streakDays}-day streak</p>
              <p className="text-xs text-orange-600/80 mt-0.5">
                {streakDays >= 30
                  ? 'Max milestone reached — keep the streak alive!'
                  : streakDays >= 14
                  ? `${30 - streakDays} more days to the 30-day bonus (UGX 5,000)`
                  : streakDays >= 7
                  ? `${14 - streakDays} more days to the 14-day bonus (UGX 2,000)`
                  : `${7 - streakDays} more days to the 7-day bonus (UGX 1,000)`
                }
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Next bonus</p>
              <p className="text-sm font-black text-orange-400">
                {streakDays >= 30 ? '—' : streakDays >= 14 ? 'UGX 5,000' : streakDays >= 7 ? 'UGX 2,000' : 'UGX 1,000'}
              </p>
            </div>
          </div>
        )}

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

            {/* Name */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</p>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3">
                <span className="text-sm font-semibold text-slate-200">{name || '—'}</span>
              </div>
            </div>

            {/* Email */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Email</p>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3">
                <span className="text-sm text-slate-300">{email || '—'}</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Mobile Money Number</p>
              {phone ? (
                <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3">
                  <span className="text-sm text-slate-300">+{phone}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => { setPhoneInput(e.target.value); setPhoneMsg(null) }}
                    placeholder="0712 345 678"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors"
                  />
                  {phoneMsg && (
                    <p className={`text-xs ${phoneMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{phoneMsg.text}</p>
                  )}
                  <button
                    onClick={savePhone}
                    disabled={phoneLoading || !phoneInput}
                    className="w-full rounded-xl border border-violet-700/50 bg-violet-900/20 py-2.5 text-xs font-bold text-violet-400 hover:bg-violet-900/40 disabled:opacity-40 transition-colors"
                  >
                    {phoneLoading ? 'Saving…' : 'Save Mobile Money number'}
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-slate-600">Used for MTN Mobile Money deposits and withdrawals.</p>
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
                    { value: stats.total,  label: 'Predictions', color: 'text-slate-200'   },
                    { value: stats.active, label: 'Active',      color: 'text-sky-400'     },
                    { value: stats.won,    label: 'Won',         color: 'text-emerald-400' },
                    { value: stats.lost,   label: 'Lost',        color: 'text-red-400'     },
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
                <p className="mt-3 text-sm text-slate-500">No predictions yet.</p>
                <Link href="/markets" className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Browse markets →
                </Link>
              </div>
            )}

            <Link
              href="/bets"
              className="block w-full rounded-xl border border-[#1e1e2e] py-2.5 text-center text-sm font-semibold text-slate-400 hover:border-violet-700/50 hover:text-white transition-colors"
            >
              View all predictions →
            </Link>
          </div>

        </div>

        {/* ── 2FA Security ── */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-slate-200">Two-Factor Authentication</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add an extra layer of security with a one-time code from your authenticator app.
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${has2fa ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' : 'bg-slate-800/50 text-slate-500 border border-slate-700/40'}`}>
              {has2fa ? '✓ Enabled' : 'Disabled'}
            </span>
          </div>

          {twoFaMsg && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${twoFaMsg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
              {twoFaMsg.text}
            </div>
          )}

          {/* Setup flow */}
          {!has2fa && !show2faSetup && (
            <button
              onClick={start2faSetup}
              disabled={twoFaLoading}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {twoFaLoading ? 'Loading…' : 'Enable 2FA'}
            </button>
          )}

          {!has2fa && show2faSetup && qrDataUrl && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-400">
                Scan this QR code with <strong className="text-slate-200">Google Authenticator</strong> or any TOTP app, then enter the 6-digit code to confirm.
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="2FA QR code" className="rounded-xl" width={180} height={180} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Confirmation code
                </label>
                <input
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-200 outline-none focus:border-violet-600"
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirm2faEnable}
                  disabled={twoFaLoading}
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
                >
                  {twoFaLoading ? 'Enabling…' : 'Confirm & enable'}
                </button>
                <button
                  onClick={() => { setShow2faSetup(false); setSetupCode(''); setTwoFaMsg(null) }}
                  className="flex-1 rounded-xl border border-[#1e1e2e] py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Disable flow */}
          {has2fa && !show2faDisable && (
            <button
              onClick={() => { setShow2faDisable(true); setDisableCode(''); setTwoFaMsg(null) }}
              className="mt-5 rounded-xl border border-red-800/40 bg-red-900/10 px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Disable 2FA
            </button>
          )}

          {has2fa && show2faDisable && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-400">
                Enter your current authenticator code to disable 2FA.
              </p>
              <input
                className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-center text-xl font-bold tracking-widest text-slate-200 outline-none focus:border-red-600"
                value={disableCode}
                onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={confirm2faDisable}
                  disabled={twoFaLoading}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {twoFaLoading ? 'Disabling…' : 'Disable 2FA'}
                </button>
                <button
                  onClick={() => { setShow2faDisable(false); setDisableCode(''); setTwoFaMsg(null) }}
                  className="flex-1 rounded-xl border border-[#1e1e2e] py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Achievement Badges ── */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6">
          <AchievementBadges />
        </div>

        {/* ── Push Notifications ── */}
        {pushPermission !== null && pushPermission !== 'unsupported' && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div>
                  <h2 className="font-bold text-slate-200">Push Notifications</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Get alerts when markets close or you win
                  </p>
                </div>
              </div>

              {pushPermission === 'granted' && (
                <span className="shrink-0 rounded-full border border-emerald-800/40 bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  ✓ Enabled
                </span>
              )}

              {pushPermission === 'denied' && (
                <span className="shrink-0 rounded-full border border-slate-700/40 bg-slate-800/50 px-3 py-1 text-xs font-bold text-slate-500">
                  Blocked
                </span>
              )}

              {pushPermission === 'default' && (
                <button
                  onClick={requestPushPermission}
                  disabled={pushLoading}
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
                >
                  {pushLoading ? 'Requesting…' : 'Enable'}
                </button>
              )}
            </div>

            {pushPermission === 'denied' && (
              <p className="mt-3 text-xs text-slate-600">
                Notifications are blocked in your browser settings. To enable them, open your browser site settings and allow notifications for this site.
              </p>
            )}
          </div>
        )}

        {/* ── WhatsApp alerts ── */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xl">📲</span>
              <div>
                <h2 className="font-bold text-slate-200">WhatsApp Market Alerts</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Get notified on WhatsApp when a hot market is featured
                </p>
              </div>
            </div>
            <button
              onClick={toggleWhatsappOptIn}
              disabled={waLoading || !userId}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                waOptedIn
                  ? 'border border-emerald-800/40 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {waLoading ? '…' : waOptedIn ? '✓ Subscribed' : 'Subscribe'}
            </button>
          </div>
          {waMsg && (
            <p className="mt-3 text-xs text-slate-500">{waMsg}</p>
          )}
          {waOptedIn && (
            <p className="mt-3 text-xs text-slate-600">
              Messages are sent to your registered phone number ({phone ? `+${phone}` : 'on file'}).
            </p>
          )}
        </div>

        {/* ── Referral Program ── */}
        <ReferralCard />

        {/* ── Email Notification Preferences ── */}
        <NotificationPreferences />

        {/* ── Navigation shortcuts ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: '/markets',              label: 'Browse Markets',  icon: '🎯' },
            { href: '/bets',                 label: 'My Predictions',  icon: '📊' },
            { href: '/wallet',               label: 'Wallet',          icon: '💳' },
            { href: '/responsible-gambling', label: 'Safe Play Tools', icon: '🛡️' },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center text-xs font-semibold text-slate-400 hover:border-violet-700/40 hover:text-white transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
