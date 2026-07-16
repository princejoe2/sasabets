'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import KYCBanner from '@/components/KYCBanner'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  balance_after: number | null
  created_at: string
}

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'payout' | 'bet' | 'referral_bonus'

const TYPE_LABEL: Record<string, string> = {
  deposit:        'Deposit',
  withdrawal:     'Withdrawal',
  cashout:        'Early Exit',
  bet:            'Bet Placed',
  payout:         'Winnings',
  refund:         'Refund',
  referral_bonus: 'Referral Bonus',
  rake:           'Platform Fee',
}

const TYPE_EMOJI: Record<string, string> = {
  deposit:        '💰',
  withdrawal:     '🏦',
  cashout:        '🏦',
  bet:            '🎯',
  payout:         '🏆',
  refund:         '↩️',
  referral_bonus: '🎁',
  rake:           '—',
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'deposit',    label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'payout',     label: 'Winnings' },
]

function filterMatch(txn: Transaction, f: FilterType): boolean {
  if (f === 'all') return true
  if (f === 'withdrawal') return txn.type === 'withdrawal' || txn.type === 'cashout'
  return txn.type === f
}

function groupByDate(txns: Transaction[]): { label: string; txns: Transaction[] }[] {
  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000
  const weekAgo   = today - 7 * 86_400_000

  const buckets: { label: string; txns: Transaction[] }[] = [
    { label: 'Today',     txns: [] },
    { label: 'Yesterday', txns: [] },
    { label: 'This Week', txns: [] },
    { label: 'Older',     txns: [] },
  ]

  for (const t of txns) {
    const d   = new Date(t.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if      (day >= today)     buckets[0].txns.push(t)
    else if (day >= yesterday) buckets[1].txns.push(t)
    else if (day >= weekAgo)   buckets[2].txns.push(t)
    else                       buckets[3].txns.push(t)
  }

  return buckets.filter(b => b.txns.length > 0)
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('en-UG')
}

// Abbreviated form for tight stat cards on mobile
function fmtK(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (abs >= 1_000)     return (abs / 1_000).toFixed(0) + 'k'
  return String(abs)
}

function WalletPageContent() {
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const isCallback   = searchParams.get('status') === 'success'
  const formRef      = useRef<HTMLDivElement>(null)

  const [balance,       setBalance]       = useState<number | null>(null)
  const [bonusBalance,  setBonusBalance]  = useState<number>(0)
  const [transactions,  setTransactions]  = useState<Transaction[]>([])
  const [activeBets,    setActiveBets]    = useState<number>(0)
  const [tab,           setTab]           = useState<'deposit' | 'withdraw'>('deposit')
  const [filter,        setFilter]        = useState<FilterType>('all')
  const [amount,        setAmount]        = useState('')
  const [depositPhone,  setDepositPhone]  = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [phone,         setPhone]         = useState('')
  const [processing,    setProcessing]    = useState(isCallback)
  const [pendingRef,    setPendingRef]    = useState<string | null>(null)
  const [phoneInput,    setPhoneInput]    = useState('')
  const [phoneLoading,  setPhoneLoading]  = useState(false)
  const [phoneError,    setPhoneError]    = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [walletRes, txnsRes, profileRes, betsRes] = await Promise.all([
      supabase.from('wallets').select('balance, bonus_balance').eq('user_id', user.id).single(),
      supabase
        .from('transactions')
        .select('id, type, amount, status, balance_after, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('phone').eq('id', user.id).single(),
      supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ])

    if (walletRes.data) {
      setBalance(walletRes.data.balance)
      setBonusBalance(Number((walletRes.data as { balance: number; bonus_balance?: number }).bonus_balance ?? 0))
    }
    if (txnsRes.data) setTransactions(txnsRes.data)
    if (profileRes.data?.phone) {
      setPhone(profileRes.data.phone)
      setDepositPhone('+' + profileRes.data.phone)
      setWithdrawPhone('+' + profileRes.data.phone)
    }
    if (betsRes.count !== null) setActiveBets(betsRes.count)
    return txnsRes.data
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime: keep balance and transactions live
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel(`wallet-page-${user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new?.balance !== undefined) setBalance(Number(payload.new.balance))
            if (payload.new?.bonus_balance !== undefined) setBonusBalance(Number(payload.new.bonus_balance))
          }
        )
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
          () => load()
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
          () => load()
        )
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [load])

  // Poll Relworx deposit status after initiation
  useEffect(() => {
    if (!pendingRef) return
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res  = await fetch(`/api/marz/deposit?ref=${pendingRef}`)
        const data = await res.json()
        if (data.status === 'completed') {
          setBalance(data.balance)
          await load()
          setProcessing(false)
          setPendingRef(null)
          setSuccess('Deposit confirmed! Your wallet has been credited.')
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setProcessing(false)
          setPendingRef(null)
          setError('Payment was not completed. Please try again.')
          clearInterval(interval)
        }
      } catch { /* keep polling */ }
      if (attempts >= 36) {
        setProcessing(false)
        setPendingRef(null)
        await load()
        setSuccess('Payment is being processed — your balance will update automatically once confirmed.')
        clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [pendingRef, load])

  function switchTab(t: 'deposit' | 'withdraw') {
    setTab(t)
    setAmount('')
    setError('')
    setSuccess('')
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  async function handleDeposit() {
    const amtNum = parseFloat(amount)
    if (!amtNum || amtNum < 1000) { setError('Minimum deposit is UGX 1,000'); return }
    if (!depositPhone) { setError('Enter a phone number to receive the USSD prompt'); return }
    setLoading(true); setError(''); setSuccess('')
    const res  = await fetch('/api/marz/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amtNum, phone: depositPhone }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to initiate deposit')
    } else {
      setPendingRef(data.reference)
      setProcessing(true)
      setAmount('')
    }
    setLoading(false)
  }

  async function handleWithdraw() {
    const amtNum = parseFloat(amount)
    if (!amtNum || amtNum < 5000) { setError('Minimum withdrawal is UGX 5,000'); return }
    if (!withdrawPhone) { setError('Enter a phone number'); return }
    if (balance !== null && amtNum > balance) { setError('Insufficient balance'); return }
    setLoading(true); setError(''); setSuccess('')
    const res  = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Note: the server always disburses to the user's verified profile phone and
      // ignores any number supplied here. We don't send a phone to avoid implying otherwise.
      body: JSON.stringify({ amount: amtNum }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Withdrawal failed')
    } else {
      // Funds always go to the verified profile number, never the editable field.
      const dest = phone ? '+' + phone : 'your registered Mobile Money number'
      setSuccess('Withdrawal submitted! UGX ' + amtNum.toLocaleString() + ' will be sent to ' + dest + ' shortly.')
      setAmount('')
      await load()
    }
    setLoading(false)
  }

  async function savePhone() {
    const raw = phoneInput.replace(/[\s\-()]/g, '')
    if (!/^(\+256|256|0)(7\d{8}|39\d{7})$/.test(raw)) {
      setPhoneError('Enter a valid Ugandan Mobile Money number (MTN or Airtel)')
      return
    }
    setPhoneLoading(true); setPhoneError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: raw }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPhoneError(data.error ?? 'Failed to save phone number')
      setPhoneLoading(false)
      return
    }
    await load()
    setPhoneInput('')
    setPhoneLoading(false)
  }

  const amtNum = parseFloat(amount) || 0
  const locked = balance !== null ? Math.min(bonusBalance, balance) : bonusBalance

  // Computed stats from transaction history
  const totalDeposited = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0)
  const totalWithdrawn = transactions
    .filter(t => (t.type === 'withdrawal' || t.type === 'cashout') && t.status === 'completed')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalWon = transactions
    .filter(t => t.type === 'payout' && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0)

  // Filtered + date-grouped transactions for the list
  const filtered = transactions.filter(t => filterMatch(t, filter))
  const grouped  = groupByDate(filtered)

  // Pending withdrawals for the banner
  const pendingWithdrawals = transactions.filter(
    t => t.type === 'withdrawal' && t.status === 'pending'
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 space-y-4 overflow-x-hidden">
      <KYCBanner />

      {/* Processing banner */}
      {processing && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
          <span className="animate-spin inline-block text-base">↻</span>
          <span>
            Check your phone — enter your Mobile Money PIN to confirm.
            <span className="ml-1 text-yellow-500">Waiting for confirmation…</span>
          </span>
        </div>
      )}

      {/* ── Balance Hero ── */}
      <div className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(140deg, #7c3aed, #5b21b6 65%, #4c1d95)', borderRadius: 22, padding: '22px 22px 20px', boxShadow: '0 18px 40px rgba(76,29,149,0.4)' }}>
        <div className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[1.6px]" style={{ color: '#d8c9f5' }}>Available Balance</p>
            <p className="mt-1.5 font-bold leading-none tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(28px, 8vw, 42px)' }}>
              {balance !== null ? `UGX ${fmt(balance)}` : '—'}
            </p>
            {locked > 0 && (
              <p className="mt-1.5 text-xs" style={{ color: '#d8c9f5' }}>🔒 UGX {fmt(locked)} bonus · betting only</p>
            )}
            {/* Mini-stats: desktop only */}
            <div className="mt-4 hidden lg:flex gap-6 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#d8c9f5' }}>Deposited</p>
                <p className="font-semibold">UGX {fmt(totalDeposited)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#d8c9f5' }}>Withdrawn</p>
                <p className="font-semibold">UGX {fmt(totalWithdrawn)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: '#d8c9f5' }}>Won</p>
                <p className="font-semibold text-emerald-300">UGX {fmt(totalWon)}</p>
              </div>
            </div>
          </div>
          {/* CTA buttons */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-3 lg:min-w-[140px]">
            <button
              onClick={() => switchTab('deposit')}
              className="flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-black transition-all"
              style={{ background: tab === 'deposit' ? '#fff' : 'rgba(255,255,255,0.16)', color: tab === 'deposit' ? '#4c1d95' : '#fff', boxShadow: tab === 'deposit' ? '0 6px 16px rgba(0,0,0,0.2)' : 'none' }}
            >
              💰 Deposit
            </button>
            <button
              onClick={() => switchTab('withdraw')}
              className="flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-black transition-all"
              style={{ background: tab === 'withdraw' ? '#fff' : 'rgba(255,255,255,0.16)', color: tab === 'withdraw' ? '#4c1d95' : '#fff', boxShadow: tab === 'withdraw' ? '0 6px 16px rgba(0,0,0,0.2)' : 'none' }}
            >
              🏦 Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat tiles — always below hero, above form on mobile ── */}
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#7c8783]">Deposited</p>
          <p className="mt-1.5 font-bold text-[#22c55e]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24 }}>{fmtK(totalDeposited)}</p>
          <p className="text-[10px] font-semibold text-[#5b655f]">UGX</p>
        </div>
        <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#7c8783]">Won</p>
          <p className="mt-1.5 font-bold text-violet-400" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24 }}>{fmtK(totalWon)}</p>
          <p className="text-[10px] font-semibold text-[#5b655f]">UGX</p>
        </div>
        <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#7c8783]">Active</p>
          <p className="mt-1.5 font-bold text-amber-400" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24 }}>{activeBets}</p>
          <p className="text-[10px] font-semibold text-[#5b655f]">bets</p>
        </div>
      </div>

      {/* ── Main grid: form (left/top) | transactions (right/bottom) ── */}
      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">

        {/* Form — first in DOM so it appears immediately below stats on mobile */}
        <div ref={formRef} className="lg:col-span-2">
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
            <div className="flex border-b border-[#1e1e2e]">
              {(['deposit', 'withdraw'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                    tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'deposit' ? '💰 Deposit' : '🏦 Withdraw'}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {tab === 'deposit' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Amount (UGX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      min="1000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                    {/* 2×2 on mobile, 4-col on desktop */}
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[5000, 10000, 50000, 100000].map(v => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className="rounded-lg border border-[#1e1e2e] py-2.5 text-xs font-medium text-slate-400 hover:border-violet-600 hover:text-white transition-colors">
                          UGX {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Mobile Money number</label>
                    <input
                      type="tel"
                      value={depositPhone}
                      onChange={e => setDepositPhone(e.target.value)}
                      placeholder="+256 700 000 000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                  </div>
                  {error   && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-emerald-400">{success}</p>}
                  <button onClick={handleDeposit} disabled={loading}
                    className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Sending prompt…' : 'Deposit via Mobile Money'}
                  </button>
                  <p className="text-center text-xs text-slate-600">MTN & Airtel Money · Prompt sent to your phone</p>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Amount (UGX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      min="5000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[5000, 10000, 50000, 100000].map(v => (
                        <button key={v}
                          onClick={() => setAmount(String(Math.min(v, balance ?? v)))}
                          disabled={balance !== null && balance < v}
                          className="rounded-lg border border-[#1e1e2e] py-2.5 text-xs font-medium text-slate-400 hover:border-violet-600 hover:text-white disabled:opacity-30 transition-colors">
                          UGX {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!phone ? (
                    <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 space-y-3">
                      <p className="text-sm font-semibold text-amber-400">Add your Mobile Money number</p>
                      <p className="text-xs text-amber-600">You need a registered Mobile Money number before you can withdraw. Enter your MTN or Airtel Uganda number below.</p>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={e => { setPhoneInput(e.target.value); setPhoneError('') }}
                        placeholder="0712 345 678"
                        className="w-full rounded-lg border border-amber-700/30 bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-amber-600 transition-colors"
                      />
                      {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}
                      <button
                        onClick={savePhone}
                        disabled={phoneLoading || !phoneInput}
                        className="w-full rounded-lg bg-amber-700 py-2.5 text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                      >
                        {phoneLoading ? 'Saving…' : 'Save number'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Send to (your verified number)</label>
                      <input
                        type="tel"
                        value={withdrawPhone}
                        readOnly
                        disabled
                        placeholder="+256 700 000 000"
                        className="w-full cursor-not-allowed rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm text-slate-400 outline-none"
                      />
                      <p className="mt-1 text-[11px] text-slate-600">
                        Withdrawals go to your verified profile number for security.
                      </p>
                    </div>
                  )}
                  {amtNum > 0 && balance !== null && (
                    <div className="rounded-lg bg-[#0a0a0f] px-4 py-3 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>You receive</span>
                        <span className="text-emerald-400 font-semibold">UGX {amtNum.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Remaining balance</span>
                        <span>UGX {Math.max(0, balance - amtNum).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {error   && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-emerald-400">{success}</p>}
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || !phone || amtNum < 5000 || (balance !== null && amtNum > balance)}
                    className="w-full rounded-xl bg-emerald-700 py-3.5 text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                    {loading ? 'Processing…' : 'Request Withdrawal'}
                  </button>
                  <p className="text-center text-xs text-slate-600">Processed within 24 hours · Min UGX 5,000</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right col: stats (mobile only) + transactions */}
        <div className="lg:col-span-3 space-y-4">

          {/* Pending withdrawals banner */}
          {pendingWithdrawals.length > 0 && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-900/15 px-4 py-3 text-sm text-amber-300">
              <p className="font-semibold">
                {pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length > 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-xs text-amber-500">
                Withdrawals are processed within 24 hours to your registered Mobile Money number.
              </p>
            </div>
          )}

          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map(({ key, label }) => {
              const count  = key === 'all'
                ? transactions.length
                : transactions.filter(t => filterMatch(t, key)).length
              const active = filter === key
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'border border-[#1e1e2e] bg-[#13131a] text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? 'bg-violet-700 text-violet-200' : 'bg-[#0a0a0f] text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
            <button
              onClick={() => load()}
              className="ml-auto shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Transaction list */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-8 text-center">
              <p className="text-3xl mb-3">💳</p>
              <p className="text-sm font-medium text-slate-400">
                {transactions.length === 0
                  ? 'No transactions yet.'
                  : 'No transactions match this filter.'}
              </p>
              {transactions.length === 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  Make your first deposit to start predicting!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ label, txns }) => (
                <div key={label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
                    {txns.map((txn, i) => {
                      const credit      = txn.amount > 0
                      const isPending   = txn.status === 'pending'
                      const isFailed    = txn.status === 'failed'
                      const isCompleted = txn.status === 'completed'

                      return (
                        <div
                          key={txn.id}
                          className={`flex items-center gap-3 px-4 py-3.5 ${
                            i < txns.length - 1 ? 'border-b border-[#1e1e2e]' : ''
                          }`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                            txn.type === 'deposit'          ? 'bg-emerald-900/40'
                            : txn.type === 'payout'         ? 'bg-violet-900/40'
                            : txn.type === 'referral_bonus' ? 'bg-amber-900/40'
                            : txn.type === 'refund'         ? 'bg-sky-900/40'
                            : txn.type === 'bet'            ? 'bg-red-900/30'
                            : 'bg-slate-800'
                          }`}>
                            {TYPE_EMOJI[txn.type] ?? '·'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-medium">
                                {TYPE_LABEL[txn.type] ?? txn.type}
                              </p>
                              {isPending && (
                                <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                  pending
                                </span>
                              )}
                              {isFailed && (
                                <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                  failed
                                </span>
                              )}
                              {isCompleted && (
                                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                  completed
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {new Date(txn.created_at).toLocaleString('en-UG', {
                                day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${
                              isFailed ? 'text-slate-500 line-through'
                              : credit  ? 'text-emerald-400'
                              : 'text-red-400'
                            }`}>
                              {credit ? '+ ' : '− '}UGX {fmt(txn.amount)}
                            </p>
                            {txn.balance_after !== null && !isFailed && (
                              <p className="text-[10px] text-slate-600">
                                bal {Number(txn.balance_after).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <WalletPageContent />
    </Suspense>
  )
}
