import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Market Flags – Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminFlagsPage() {
  const admin = createAdminClient()

  const { data: flags } = await admin
    .from('market_flags')
    .select('id, market_id, user_id, reason, created_at, status, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (!flags?.length) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Market Flags</h1>
          <p className="mt-1 text-slate-500">Disputes submitted by users on settled markets.</p>
        </div>
        <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] py-20 text-center">
          <p className="text-5xl">🚩</p>
          <p className="mt-4 text-lg font-bold text-slate-400">No flags yet</p>
          <p className="mt-2 text-sm text-slate-600">Disputes will appear here when users challenge a settlement.</p>
        </div>
      </div>
    )
  }

  const marketIds = Array.from(new Set(flags.map(f => f.market_id)))
  const userIds   = Array.from(new Set(flags.map(f => f.user_id)))

  const [marketsRes, profilesRes] = await Promise.all([
    admin.from('markets').select('id, title').in('id', marketIds),
    admin.from('profiles').select('id, full_name, phone').in('id', userIds),
  ])

  const marketMap: Record<string, string> = {}
  for (const m of marketsRes.data ?? []) marketMap[m.id] = m.title

  const profileMap: Record<string, string> = {}
  for (const p of profilesRes.data ?? []) {
    profileMap[p.id] = p.full_name ?? (p.phone ? `+${String(p.phone).slice(-6)}` : 'Unknown')
  }

  const pending = flags.filter(f => f.status === 'pending').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Market Flags</h1>
        <p className="mt-1 text-slate-500">
          {pending} pending · {flags.length} total
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1a1a28] bg-[#0d0d18]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-[#1a1a28] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <span>Market / User</span>
          <span>Reason</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {flags.map((f, i) => (
          <div
            key={f.id}
            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 ${i < flags.length - 1 ? 'border-b border-[#131320]' : ''}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{marketMap[f.market_id] ?? f.market_id.slice(0, 8)}</p>
              <p className="text-xs text-slate-600">by {profileMap[f.user_id] ?? 'Unknown'}</p>
            </div>
            <span className="text-xs text-slate-400">{f.reason ?? '—'}</span>
            <span className="text-xs text-slate-600">
              {new Date(f.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
              f.status === 'pending' ? 'bg-amber-900/40 text-amber-400' :
              f.status === 'reviewed' ? 'bg-slate-800 text-slate-500' :
              'bg-emerald-900/40 text-emerald-400'
            }`}>
              {f.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
