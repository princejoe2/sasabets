import { createAdminClient } from '@/lib/supabase/server'

const TYPE_COLOR: Record<string, string> = {
  deposit:    'bg-emerald-900/40 text-emerald-400',
  withdrawal: 'bg-orange-900/40 text-orange-400',
  bet:        'bg-blue-900/40 text-blue-400',
  payout:     'bg-violet-900/40 text-violet-400',
  refund:     'bg-amber-900/40 text-amber-400',
}

export default async function AdminTransactionsPage() {
  const admin = createAdminClient()

  const { data: txns } = await admin
    .from('transactions')
    .select('*, profiles(phone, full_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  const deposits    = txns?.filter(t => t.type === 'deposit'    && t.status === 'completed').reduce((s,t) => s + Number(t.amount), 0) ?? 0
  const withdrawals = txns?.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s,t) => s + Math.abs(Number(t.amount)), 0) ?? 0
  const bets        = txns?.filter(t => t.type === 'bet').reduce((s,t) => s + Math.abs(Number(t.amount)), 0) ?? 0
  const payouts     = txns?.filter(t => t.type === 'payout'     && t.status === 'completed').reduce((s,t) => s + Number(t.amount), 0) ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Transactions</h1>
        <p className="mt-1 text-slate-500">{txns?.length ?? 0} total records</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Deposited',  value: deposits,    color: '#34d399' },
          { label: 'Total Withdrawn',  value: withdrawals, color: '#fb923c' },
          { label: 'Total Wagered',    value: bets,        color: '#60a5fa' },
          { label: 'Total Paid Out',   value: payouts,     color: '#a78bfa' },
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
        {txns?.map((t, i) => {
          const phone = (t.profiles as {phone:string}|null)?.phone ?? '—'
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
      </div>
    </div>
  )
}
