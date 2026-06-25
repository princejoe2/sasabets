import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPayoutsPage() {
  const admin = createAdminClient()

  const [{ data: payoutTxns }, { data: profiles }] = await Promise.all([
    admin
      .from('transactions')
      .select('id, user_id, amount, status, created_at, metadata')
      .eq('type', 'payout')
      .order('created_at', { ascending: false })
      .limit(300),
    admin.from('profiles').select('id, phone, full_name'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const totalPaid = (payoutTxns ?? []).filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0)
  const biggestWin = Math.max(...(payoutTxns ?? []).map(t => Number(t.amount)), 0)
  const payoutCount = payoutTxns?.length ?? 0
  const avgPayout = payoutCount > 0 ? totalPaid / payoutCount : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Payouts</h1>
        <p className="mt-1 text-slate-500">All winning payouts distributed to players</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Paid Out',  value: `UGX ${(totalPaid/1000).toFixed(1)}K`,  color: '#a78bfa' },
          { label: 'Payout Count',    value: payoutCount,                             color: '#60a5fa' },
          { label: 'Biggest Win',     value: `UGX ${(biggestWin/1000).toFixed(1)}K`, color: '#fbbf24' },
          { label: 'Avg Payout',      value: `UGX ${Math.round(avgPayout).toLocaleString()}`, color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Payout table */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="border-b border-[#1a1a28] px-5 py-4">
          <h2 className="font-black text-slate-200">All Payouts</h2>
          <p className="text-xs text-slate-600 mt-0.5">Most recent first · {payoutCount} total</p>
        </div>

        {payoutTxns?.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🏆</p>
            <p className="font-bold text-slate-400">No payouts yet</p>
            <p className="text-sm text-slate-600 mt-1">Payouts appear after markets are settled.</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
              <span className="text-right">Date</span>
            </div>

            {payoutTxns?.map((t, i) => {
              const profile = profileMap[t.user_id]
              const meta = t.metadata as { market_title?: string; option_label?: string } | null
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-[#111120] transition-colors ${i < (payoutTxns?.length ?? 0) - 1 ? 'border-b border-[#1a1a28]' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-slate-200">+{profile?.phone ?? t.user_id.slice(0, 8)}</p>
                    {meta?.market_title && (
                      <p className="text-xs text-slate-600 truncate mt-0.5">{meta.market_title}</p>
                    )}
                    {meta?.option_label && (
                      <p className="text-xs text-violet-500 mt-0.5">Picked: {meta.option_label}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">+UGX {Number(t.amount).toLocaleString()}</p>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold ${t.status === 'completed' ? 'text-emerald-500' : t.status === 'pending' ? 'text-amber-500' : 'text-red-500'}`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-600">
                      {new Date(t.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-slate-700">
                      {new Date(t.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
