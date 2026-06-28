import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function AdminMarketEventsPage() {
  const admin = createAdminClient()
  const { data: events } = await admin
    .from('market_events')
    .select('id, market_id, event_type, event_data, actor_type, actor_id, created_at, markets(title)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: surgeMarkets } = await admin
    .from('markets')
    .select('id, title, total_pool, status, surge_flag')
    .eq('surge_flag', true)

  const EVENT_ICONS: Record<string, string> = {
    market_closed:    '🔒',
    market_suspended: '🚨',
    surge_detected:   '⚡',
    surge_cleared:    '✅',
  }

  const EVENT_COLORS: Record<string, string> = {
    market_closed:    'text-slate-400',
    market_suspended: 'text-red-400',
    surge_detected:   'text-amber-400',
    surge_cleared:    'text-emerald-400',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Market Events</h1>
        <p className="mt-1 text-slate-500">Surge detections, market closures, and suspensions</p>
      </div>

      {/* Surge-flagged markets */}
      {(surgeMarkets ?? []).length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-800/40 bg-amber-900/10 p-5">
          <h2 className="mb-3 font-bold text-amber-400">⚡ Markets with active surge flag</h2>
          <div className="space-y-2">
            {surgeMarkets!.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-[#1e1e2e] bg-[#0d0d14] px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{m.title}</p>
                  <p className="text-xs text-slate-500">Pool: UGX {Number(m.total_pool).toLocaleString()} · Status: {m.status}</p>
                </div>
                <form action={`/api/admin/market/${m.id}/clear-surge`} method="POST">
                  <button
                    type="submit"
                    className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                  >
                    Clear flag
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
        <div className="border-b border-[#1e1e2e] px-5 py-4">
          <h2 className="font-bold text-white">Event log</h2>
        </div>
        {(events ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500">No events yet.</div>
        ) : (
          <div className="divide-y divide-[#1e1e2e]">
            {events!.map(ev => {
              const mkt = (Array.isArray(ev.markets) ? ev.markets[0] : ev.markets) as { title: string } | null
              const icon  = EVENT_ICONS[ev.event_type]  ?? '📋'
              const color = EVENT_COLORS[ev.event_type] ?? 'text-slate-400'
              const data  = ev.event_data as Record<string, unknown> | null
              return (
                <div key={ev.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${color}`}>{ev.event_type.replace(/_/g, ' ')}</span>
                      {mkt && <span className="text-xs text-slate-500 truncate">{mkt.title}</span>}
                    </div>
                    {data && (
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-600">
                        {data.shift_pct != null && <span>Shift: {String(data.shift_pct)}%</span>}
                        {data.final_pool != null && <span>Pool: UGX {Number(data.final_pool).toLocaleString()}</span>}
                        {data.final_bettor_count != null && <span>{String(data.final_bettor_count)} bettors</span>}
                        {data.pool_before != null && (
                          <span>UGX {Number(data.pool_before).toLocaleString()} → {Number(data.pool_after).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-600 tabular-nums">
                    {new Date(ev.created_at).toLocaleString('en-UG', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
