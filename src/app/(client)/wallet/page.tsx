'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  balance_after: number | null
  pesapal_tracking_id: string | null
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bet: 'Bet placed',
  payout: 'Winnings',
  refund: 'Refund',
}

const TYPE_ICON: Record<string, string> = {
  deposit: '↓',
  withdrawal: '↑',
  bet: '●',
  payout: '★',
  refund: '↺',
}

function WalletPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const isCallback = searchParams.get('status') === 'success'

  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(isCallback)
  const [pendingRef, setPendingRef] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: wallet }, { data: txns }, { data: profile }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      supabase
        .from('transactions')
        .select('id, type, amount, status, balance_after, pesapal_tracking_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('phone').eq('id', user.id).single(),
    ])

    if (wallet) setBalance(wallet.balance)
    if (txns) setTransactions(txns)
    if (profile?.phone) {
      setPhone(profile.phone)
      setWithdrawPhone('+' + profile.phone)
    }
    return txns
  }, [])

  useEffect(() => { load() }, [load])

  // Poll Relworx deposit status after initiation
  useEffect(() => {
    if (!pendingRef) return
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/marz/deposit?ref=${pendingRef}`)
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
      if (attempts >= 20) {
        setProcessing(false)
        setPendingRef(null)
        await load()
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
  }

  async function handleDeposit() {
    const amtNum = parseFloat(amount)
    if (!amtNum || amtNum < 1000) { setError('Minimum deposit is UGX 1,000'); return }
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch('/api/marz/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amtNum }),
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
    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amtNum, phone: withdrawPhone }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Withdrawal failed')
    } else {
      setSuccess('Withdrawal requested! We\'ll send UGX ' + amtNum.toLocaleString() + ' to ' + withdrawPhone + ' within 24 hours.')
      setAmount('')
      await load()
    }
    setLoading(false)
  }

  const amtNum = parseFloat(amount) || 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {processing && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-5 py-4 text-sm text-yellow-300">
          <span className="animate-spin inline-block">↻</span>
          <span>
            Check your phone — enter your Mobile Money PIN to confirm the payment.
            <span className="ml-1 text-yellow-500">Waiting for confirmation…</span>
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: balance + actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Balance card */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-8 text-center">
            <p className="mb-1 text-sm text-slate-500">Available Balance</p>
            <p className="text-5xl font-bold text-violet-400">
              {balance !== null ? `UGX ${Number(balance).toLocaleString()}` : '—'}
            </p>
            {phone && <p className="mt-2 text-xs text-slate-600">+{phone}</p>}
          </div>

          {/* Tabs */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
            <div className="flex border-b border-[#1e1e2e]">
              {(['deposit', 'withdraw'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === t
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {tab === 'deposit' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Amount (UGX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      min="1000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[5000, 10000, 50000, 100000].map(v => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className="rounded border border-[#1e1e2e] py-1.5 text-xs text-slate-400 hover:border-violet-700 hover:text-white transition-colors">
                          {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button onClick={handleDeposit} disabled={loading}
                    className="w-full rounded-lg bg-violet-600 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Sending prompt…' : 'Deposit via Mobile Money'}
                  </button>
                  <p className="text-center text-xs text-slate-600">MTN & Airtel Money · Prompt sent to your phone</p>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Amount (UGX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      min="5000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[5000, 10000, 50000, 100000].map(v => (
                        <button key={v}
                          onClick={() => setAmount(String(Math.min(v, balance ?? v)))}
                          disabled={balance !== null && balance < v}
                          className="rounded border border-[#1e1e2e] py-1.5 text-xs text-slate-400 hover:border-violet-700 hover:text-white disabled:opacity-30 transition-colors">
                          {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Send to (MTN / Airtel number)</label>
                    <input
                      type="tel"
                      value={withdrawPhone}
                      onChange={e => setWithdrawPhone(e.target.value)}
                      placeholder="+256 700 000 000"
                      className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                  </div>
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
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-emerald-400">{success}</p>}
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || amtNum < 5000 || (balance !== null && amtNum > balance)}
                    className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                    {loading ? 'Processing…' : 'Request Withdrawal'}
                  </button>
                  <p className="text-center text-xs text-slate-600">Processed within 24 hours · Min UGX 5,000</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: transaction history */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Transactions</h2>
            <button onClick={() => load()} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-12 text-center text-sm text-slate-500">
              No transactions yet.
            </div>
          ) : (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
              {transactions.map((txn, i) => {
                const isCredit = txn.amount > 0
                const isPending = txn.status === 'pending'
                const isFailed = txn.status === 'failed'
                return (
                  <div key={txn.id}
                    className={`flex items-center gap-4 px-5 py-4 ${i < transactions.length - 1 ? 'border-b border-[#1e1e2e]' : ''}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      txn.type === 'deposit' ? 'bg-emerald-900/40 text-emerald-400'
                      : txn.type === 'withdrawal' ? 'bg-orange-900/40 text-orange-400'
                      : txn.type === 'payout' ? 'bg-violet-900/40 text-violet-400'
                      : txn.type === 'bet' ? 'bg-red-900/30 text-red-400'
                      : 'bg-slate-800 text-slate-400'
                    }`}>
                      {TYPE_ICON[txn.type] ?? '·'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{TYPE_LABEL[txn.type] ?? txn.type}</p>
                        {isPending && (
                          <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] text-yellow-400">pending</span>
                        )}
                        {isFailed && (
                          <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] text-red-400">failed</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(txn.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {txn.pesapal_tracking_id && (
                          <span className="ml-2 font-mono text-[10px] text-slate-600">{txn.pesapal_tracking_id.slice(0, 8)}…</span>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isFailed ? 'text-slate-500 line-through' : isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isCredit ? '+' : ''}UGX {Math.abs(txn.amount).toLocaleString()}
                      </p>
                      {txn.balance_after !== null && !isFailed && (
                        <p className="text-[10px] text-slate-600">bal {Number(txn.balance_after).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )
              })}
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
