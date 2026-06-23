'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  reference: string | null
  pesapal_tracking_id: string | null
  created_at: string
  profiles: { phone: string; full_name: string | null } | null
}

const TYPE_COLOR: Record<string, string> = {
  deposit:    'bg-emerald-900/40 text-emerald-400',
  withdrawal: 'bg-orange-900/40 text-orange-400',
  bet:        'bg-blue-900/40 text-blue-400',
  payout:     'bg-violet-900/40 text-violet-400',
  refund:     'bg-amber-900/40 text-amber-400',
}

function csvCell(value: string | number): string {
  const s = String(value ?? '')
  // Quote and escape values containing commas, quotes, or newlines.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function AdminTransactionsClient() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loaded, setLoaded] = useState(false)

  // Initial load via the browser client.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    ;(async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, type, amount, status, reference, pesapal_tracking_id, created_at, profiles(phone, full_name)')
        .order('created_at', { ascending: false })
        .limit(500)
      if (!cancelled) {
        setTxns((data as Transaction[] | null) ?? [])
        setLoaded(true)
      }
    })()

    const channel = supabase
      .channel('admin-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const row = payload.new as Transaction
          setTxns(prev => prev.some(t => t.id === row.id) ? prev : [row, ...prev])
        }
      )
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  const totals = useMemo(() => {
    const deposits    = txns.filter(t => t.type === 'deposit'    && t.status === 'completed').reduce((s,t) => s + Number(t.amount), 0)
    const withdrawals = txns.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
    const bets        = txns.filter(t => t.type === 'bet').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
    const payouts     = txns.filter(t => t.type === 'payout'     && t.status === 'completed').reduce((s,t) => s + Number(t.amount), 0)
    return { deposits, withdrawals, bets, payouts }
  }, [txns])

  function downloadCsv() {
    const header = ['Date', 'Type', 'User Phone', 'Amount (UGX)', 'Status', 'Reference']
    const lines = txns.map(t => [
      new Date(t.created_at).toISOString(),
      t.type,
      t.profiles?.phone ? `+${t.profiles.phone}` : '',
      Number(t.amount),
      t.status,
      t.reference ?? t.pesapal_tracking_id ?? '',
    ].map(csvCell).join(','))

    const csv = [header.map(csvCell).join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">Transactions</h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <p className="mt-1 text-slate-500">{txns.length} records{loaded ? '' : ' · loading…'}</p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={txns.length === 0}
          className="rounded-xl border border-[#2a2a3e] bg-[#0d0d18] px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-violet-700 hover:text-white disabled:opacity-40 transition-colors"
        >
          ⬇ Download CSV
        </button>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Deposited',  value: totals.deposits,    color: '#34d399' },
          { label: 'Total Withdrawn',  value: totals.withdrawals, color: '#fb923c' },
          { label: 'Total Wagered',    value: totals.bets,        color: '#60a5fa' },
          { label: 'Total Paid Out',   value: totals.payouts,     color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-xl font-black" style={{ color: s.color }}>UGX {s.value.toLocaleString()}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <span>Type</span><span>User</span><span>Date</span><span className="text-right">Amount</span><span>Status</span><span>Ref</span>
        </div>
        {txns.map((t, i) => {
          const phone = t.profiles?.phone ?? '—'
          return (
            <div key={t.id} className={`grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-[#111120] transition-colors ${i < (txns.length-1) ? 'border-b border-[#1a1a28]' : ''}`}>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLOR[t.type] ?? 'bg-slate-800 text-slate-400'}`}>
                {t.type}
              </span>
              <span className="text-xs font-mono text-slate-300 truncate">+{phone}</span>
              <span className="text-xs text-slate-500">
                {new Date(t.created_at).toLocaleString('en-UG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
              </span>
              <span className={`text-sm font-bold text-right ${Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {Number(t.amount) >= 0 ? '+' : ''}UGX {Math.abs(Number(t.amount)).toLocaleString()}
              </span>
              <span className={`text-xs ${t.status === 'completed' ? 'text-emerald-600' : t.status === 'pending' ? 'text-amber-500' : 'text-red-500'}`}>
                {t.status}
              </span>
              <span className="text-[10px] font-mono text-slate-700 truncate max-w-[80px]">
                {t.pesapal_tracking_id?.slice(0,8) ?? t.reference?.slice(0,8) ?? '—'}
              </span>
            </div>
          )
        })}
        {loaded && txns.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-slate-600">No transactions yet.</div>
        )}
      </div>
    </div>
  )
}
