import { createAdminClient } from '@/lib/supabase/server'
import AdminFundsClient from '@/components/admin/AdminFundsClient'

export default async function AdminFundsPage() {
  const admin = createAdminClient()

  const [{ data: txns }, { data: wallets }, { data: profiles }] = await Promise.all([
    admin.from('transactions').select('type, amount, status, created_at'),
    admin.from('wallets').select('user_id, balance'),
    admin.from('profiles').select('id, phone, full_name'),
  ])

  const completed = txns?.filter(t => t.status === 'completed') ?? []
  const totalDeposited  = completed.filter(t => t.type === 'deposit').reduce((s,t) => s+Number(t.amount), 0)
  const totalWithdrawn  = completed.filter(t => t.type === 'withdrawal').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)
  const totalBetVol     = completed.filter(t => t.type === 'bet').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)
  const totalPaidOut    = completed.filter(t => t.type === 'payout').reduce((s,t) => s+Number(t.amount), 0)
  const rakeEstimate    = totalBetVol * 0.08
  const totalUserFunds  = (wallets ?? []).reduce((s,w) => s+Number(w.balance), 0)

  const walletList = (wallets ?? []).map(w => {
    const profile = profiles?.find(p => p.id === w.user_id)
    return { ...w, phone: profile?.phone ?? '—', name: profile?.full_name ?? null }
  }).sort((a,b) => Number(b.balance) - Number(a.balance))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Funds & Rake</h1>
        <p className="mt-1 text-slate-500">Platform revenue, balances, and manual adjustments</p>
      </div>

      {/* Financial overview */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: 'Total Deposited',    value: totalDeposited,  color: '#34d399' },
          { label: 'Total Withdrawn',    value: totalWithdrawn,  color: '#fb923c' },
          { label: 'Total Bet Volume',   value: totalBetVol,     color: '#60a5fa' },
          { label: 'Total Paid Out',     value: totalPaidOut,    color: '#a78bfa' },
          { label: 'Rake Collected (8%)',value: rakeEstimate,    color: '#fbbf24' },
          { label: 'User Funds on Hand', value: totalUserFunds,  color: '#f472b6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-xl font-black" style={{ color: s.color }}>UGX {s.value.toLocaleString()}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Manual adjustment + user wallets */}
      <AdminFundsClient wallets={walletList} />
    </div>
  )
}
