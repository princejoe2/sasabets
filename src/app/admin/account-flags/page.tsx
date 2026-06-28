import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 0

const FLAG_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  new_account_large_bet: { label: 'Large bet (new account)', color: 'text-amber-400',  icon: '🆕' },
  velocity_exceeded:     { label: 'Velocity exceeded',       color: 'text-orange-400', icon: '🔥' },
  surge_bet:             { label: 'Surge bet',               color: 'text-red-400',    icon: '⚡' },
  position_limit:        { label: 'Position limit hit',      color: 'text-violet-400', icon: '📊' },
}

export default async function AdminAccountFlagsPage() {
  const admin = createAdminClient()
  const { data: flags } = await admin
    .from('account_flags')
    .select('id, user_id, flag_type, market_id, details, flagged_at, flagged_by, resolved_at, profiles!account_flags_user_id_fkey(full_name, phone), markets(title)')
    .is('resolved_at', null)
    .order('flagged_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Account Flags</h1>
        <p className="mt-1 text-slate-500">Unresolved flags from bet placement guards and surge detection</p>
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
        <div className="border-b border-[#1e1e2e] px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white">Open flags</h2>
          <span className="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-bold text-red-400">
            {(flags ?? []).length}
          </span>
        </div>
        {(flags ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500">No open flags. ✓</div>
        ) : (
          <div className="divide-y divide-[#1e1e2e]">
            {flags!.map(f => {
              const profile = (Array.isArray(f.profiles) ? f.profiles[0] : f.profiles) as { full_name: string | null; phone: string } | null
              const mkt     = (Array.isArray(f.markets) ? f.markets[0] : f.markets) as { title: string } | null
              const cfg     = FLAG_CONFIG[f.flag_type] ?? { label: f.flag_type, color: 'text-slate-400', icon: '📋' }
              const details = f.details as Record<string, unknown> | null

              return (
                <div key={f.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="text-lg shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-400">{profile?.full_name ?? profile?.phone ?? f.user_id.slice(0, 8)}</span>
                    </div>
                    {mkt && <p className="text-xs text-slate-500 mt-0.5 truncate">{mkt.title}</p>}
                    {details && (
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-600">
                        {details.amount != null && <span>Amount: UGX {Number(details.amount).toLocaleString()}</span>}
                        {details.shift_pct != null && <span>Shift: {String(details.shift_pct)}%</span>}
                        {details.bets_last_hour != null && <span>Bets/hr: {String(details.bets_last_hour)}</span>}
                        {details.account_age_hours != null && <span>Account age: {String(details.account_age_hours)}h</span>}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-slate-600">
                      {new Date(f.flagged_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}by {f.flagged_by}
                    </p>
                  </div>
                  <form action={`/api/admin/account-flags/${f.id}/resolve`} method="POST">
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                    >
                      Resolve
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
