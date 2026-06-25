import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminBetsPage() {
  const admin = createAdminClient()

  const { data: bets } = await admin
    .from('bets')
    .select('*, profiles(phone, full_name), markets(id, title, options, status, winning_option_id)')
    .order('placed_at', { ascending: false })

  const active = bets?.filter(b => b.status === 'active') ?? []
  const settled = bets?.filter(b => b.status !== 'active') ?? []

  function getOptionLabel(market: { options: Array<{id:string;label:string}> } | null, optionId: string) {
    if (!market?.options) return optionId
    return market.options.find((o: {id:string;label:string}) => o.id === optionId)?.label ?? optionId
  }

  function Row({ b }: { b: NonNullable<typeof bets>[0] }) {
    const phone = (b.profiles as {phone:string}|null)?.phone ?? '—'
    const market = b.markets as {id:string;title:string;options:Array<{id:string;label:string}>;status:string;winning_option_id:string|null}|null
    const optLabel = getOptionLabel(market, b.option_id)
    return (
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-4 px-5 py-3.5 border-b border-[#1a1a28] last:border-0 text-sm">
        <span className="text-slate-300 font-mono">+{phone}</span>
        <span className="text-slate-400 truncate">{market?.title ?? '—'}</span>
        <span className="text-slate-300">{optLabel}</span>
        <span className="font-bold text-slate-200">UGX {Number(b.amount).toLocaleString()}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-center ${
          b.status === 'active' ? 'bg-sky-900/40 text-sky-400' :
          b.status === 'won'    ? 'bg-emerald-900/40 text-emerald-400' :
          'bg-red-900/30 text-red-400'
        }`}>{b.status}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Active Bets</h1>
        <p className="mt-1 text-slate-500">{active.length} open predictions · {(bets?.length ?? 0)} total</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: active.length, color: '#60a5fa' },
          { label: 'Won', value: settled.filter(b => b.status === 'won').length, color: '#34d399' },
          { label: 'Lost', value: settled.filter(b => b.status === 'lost').length, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5 text-center" style={{ borderColor: `${s.color}20` }}>
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active bets table */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-sky-500">Open Predictions</h2>
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-2.5 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span><span>Market</span><span>Pick</span><span>Stake</span><span>Status</span>
            </div>
            {active.map(b => <Row key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {/* Settled bets */}
      {settled.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-600">Settled</h2>
          <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-2.5 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>User</span><span>Market</span><span>Pick</span><span>Stake</span><span>Result</span>
            </div>
            {settled.map(b => <Row key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  )
}
