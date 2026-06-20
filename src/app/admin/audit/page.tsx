import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminAuditPage() {
  const admin = createAdminClient()

  const [{ data: transactions }, { data: markets }, { data: profiles }] = await Promise.all([
    admin
      .from('transactions')
      .select('id, user_id, type, amount, status, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('markets')
      .select('id, title, status, settled_at, created_at, winning_option_id')
      .order('created_at', { ascending: false }),
    admin.from('profiles').select('id, phone'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.phone]))

  // Build audit events from different sources
  type AuditEvent = {
    id: string
    ts: string
    category: string
    color: string
    icon: string
    title: string
    detail: string
    actor: string
  }

  const events: AuditEvent[] = []

  // Manual fund adjustments
  ;(transactions ?? [])
    .filter(t => (t.metadata as { admin_adjustment?: boolean } | null)?.admin_adjustment)
    .forEach(t => {
      const meta = t.metadata as { note?: string; admin_id?: string } | null
      const phone = profileMap[t.user_id] ?? t.user_id.slice(0, 8)
      events.push({
        id: `adj-${t.id}`,
        ts: t.created_at,
        category: 'Fund Adjustment',
        color: '#fb923c',
        icon: '💰',
        title: `${Number(t.amount) > 0 ? 'Credit' : 'Debit'} on +${phone}`,
        detail: `UGX ${Math.abs(Number(t.amount)).toLocaleString()} · ${meta?.note ?? 'Manual adjustment'}`,
        actor: meta?.admin_id ? `Admin ${meta.admin_id.slice(0, 6)}` : 'Admin',
      })
    })

  // Withdrawal actions (completed/failed)
  ;(transactions ?? [])
    .filter(t => t.type === 'withdrawal' && (t.status === 'completed' || t.status === 'failed'))
    .forEach(t => {
      const phone = profileMap[t.user_id] ?? t.user_id.slice(0, 8)
      events.push({
        id: `wd-${t.id}`,
        ts: t.created_at,
        category: 'Withdrawal',
        color: t.status === 'completed' ? '#34d399' : '#f87171',
        icon: t.status === 'completed' ? '✓' : '✕',
        title: `Withdrawal ${t.status} for +${phone}`,
        detail: `UGX ${Math.abs(Number(t.amount)).toLocaleString()}`,
        actor: 'Admin',
      })
    })

  // Market settlements
  ;(markets ?? [])
    .filter(m => m.status === 'settled' && m.settled_at)
    .forEach(m => {
      events.push({
        id: `mkt-${m.id}`,
        ts: m.settled_at!,
        category: 'Market Settled',
        color: '#a78bfa',
        icon: '🏪',
        title: `Settled: ${m.title}`,
        detail: m.winning_option_id ? `Winning option ID: ${m.winning_option_id}` : 'No winner recorded',
        actor: 'Admin',
      })
    })

  // Sort all events by timestamp descending
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Audit Log</h1>
        <p className="mt-1 text-slate-500">All administrative actions across the platform</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Total Events',   value: events.length,                                               color: '#60a5fa' },
          { label: 'Fund Adjustments', value: events.filter(e => e.category === 'Fund Adjustment').length, color: '#fb923c' },
          { label: 'Withdrawals Processed', value: events.filter(e => e.category === 'Withdrawal').length, color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5" style={{ borderColor: `${s.color}20` }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="border-b border-[#1a1a28] px-5 py-4">
          <h2 className="font-black text-slate-200">Event Log</h2>
          <p className="text-xs text-slate-600 mt-0.5">{events.length} admin actions recorded</p>
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="font-bold text-slate-400">No admin actions yet</p>
            <p className="text-sm text-slate-600 mt-1">Fund adjustments, withdrawals, and market settlements will appear here.</p>
          </div>
        ) : (
          <div>
            {events.slice(0, 100).map((ev, i) => (
              <div
                key={ev.id}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-[#111120] transition-colors ${i < Math.min(events.length, 100) - 1 ? 'border-b border-[#1a1a28]' : ''}`}
              >
                {/* Icon */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                  style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}30` }}
                >
                  {ev.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: `${ev.color}20`, color: ev.color }}
                        >
                          {ev.category}
                        </span>
                        <p className="text-sm font-semibold text-slate-200">{ev.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{ev.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-600">
                        {new Date(ev.ts).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-700">
                        {new Date(ev.ts).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-700 mt-0.5">{ev.actor}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {events.length > 100 && (
              <div className="px-5 py-4 text-center text-xs text-slate-600">
                Showing 100 of {events.length} events
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
