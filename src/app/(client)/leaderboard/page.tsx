import { createAdminClient, createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LeaderboardRefresher } from '@/components/LeaderboardRefresher'

export const metadata: Metadata = {
  title: 'Leaderboard – Top Predictors',
  description: 'See Uganda\'s top predictors on Sabula 256. Ranked by net profit and win rate. Create your own market to climb the ranks.',
  alternates: { canonical: 'https://sabula256.com/leaderboard' },
}

export const dynamic = 'force-dynamic'

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'all' | 'month' | 'week'
type View = 'predictors' | 'creators'

type Row = {
  id: string
  name: string
  wins: number
  losses: number
  total: number
  staked: number
  received: number
  net: number
  winRate: number
}

type CreatorRow = {
  id: string
  name: string
  marketCount: number
  totalPool: number
  earnings: number
  bettorCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(fullName: string | null, phone: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
  }
  if (phone) return `+${String(phone).slice(-6)}`
  return 'Anonymous'
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

function fmtNet(net: number): string {
  return `${net >= 0 ? '+' : '-'}UGX ${Math.abs(Math.round(net)).toLocaleString()}`
}

function periodLabel(p: Period): string {
  return p === 'month' ? 'This Month' : p === 'week' ? 'This Week' : 'All Time'
}

function periodStart(p: Period): string | null {
  if (p === 'all') return null
  const now = new Date()
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PodiumSlot({ player, place, heightClass }: {
  player: Row
  place: 1 | 2 | 3
  heightClass: string
}) {
  const cfg = {
    1: {
      bg: 'bg-amber-950/50',
      border: 'border-amber-500/40',
      nameColor: 'text-amber-200',
      statColor: 'text-amber-600',
      dimColor: 'text-amber-700/60',
      avatarGrad: 'from-amber-400 to-yellow-600',
      avatarExtra: 'ring-2 ring-amber-400/60 h-16 w-16 text-lg',
      medal: '🥇',
      label: '1st',
      labelColor: 'text-amber-400',
    },
    2: {
      bg: 'bg-slate-800/25',
      border: 'border-slate-500/30',
      nameColor: 'text-slate-300',
      statColor: 'text-slate-500',
      dimColor: 'text-slate-600',
      avatarGrad: 'from-slate-400 to-slate-600',
      avatarExtra: 'h-12 w-12 text-sm',
      medal: '🥈',
      label: '2nd',
      labelColor: 'text-slate-400',
    },
    3: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-800/30',
      nameColor: 'text-amber-700',
      statColor: 'text-amber-800/80',
      dimColor: 'text-amber-900/60',
      avatarGrad: 'from-amber-700 to-amber-900',
      avatarExtra: 'h-12 w-12 text-sm',
      medal: '🥉',
      label: '3rd',
      labelColor: 'text-amber-700',
    },
  }[place]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-black text-white shadow-lg ${cfg.avatarGrad} ${cfg.avatarExtra}`}
      >
        {getInitials(player.name)}
      </div>
      <p className={`mt-0.5 max-w-[100px] truncate text-center text-sm font-black ${cfg.nameColor}`}>
        {player.name}
      </p>
      <p className={`text-[10px] font-semibold ${cfg.statColor}`}>{fmtNet(player.net)}</p>
      <div
        className={`flex w-28 ${heightClass} flex-col items-center justify-center gap-1 rounded-t-xl border ${cfg.bg} ${cfg.border}`}
      >
        <span className="text-xl leading-none">{cfg.medal}</span>
        <span className={`text-xs font-black ${cfg.labelColor}`}>{cfg.label}</span>
        <span className={`text-[10px] ${cfg.dimColor}`}>{player.winRate}%&nbsp;WR</span>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>
}) {
  const { period: periodParam, view: viewParam } = await searchParams
  const period: Period = (['all', 'month', 'week'] as Period[]).includes(
    periodParam as Period,
  )
    ? (periodParam as Period)
    : 'all'

  const view: View = viewParam === 'creators' ? 'creators' : 'predictors'

  // Current user (best-effort — no redirect on failure)
  let currentUserId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    currentUserId = user?.id ?? null
  } catch {
    // unauthenticated or cookies unavailable
  }

  // Leaderboard data via admin client
  let bets: Array<{
    user_id: string
    amount: number
    settled_payout: number | null
    status: string
  }> = []
  let profiles: Array<{
    id: string
    full_name: string | null
    phone: string | null
    is_admin: boolean
  }> = []
  let creatorRows: CreatorRow[] = []

  try {
    const admin = createAdminClient()
    const startDate = periodStart(period)

    const [betsRes, profilesRes] = await Promise.all([
      (() => {
        let q = admin
          .from('bets')
          .select('user_id, amount, settled_payout, status')
          .in('status', ['won', 'lost'])
        if (startDate) q = q.gte('placed_at', startDate)
        return q
      })(),
      admin.from('profiles').select('id, full_name, phone, is_admin'),
    ])
    bets = betsRes.data ?? []
    profiles = profilesRes.data ?? []

    // Creators leaderboard data
    const adminIds = new Set(profiles.filter(p => p.is_admin).map(p => p.id))

    let marketsQuery = admin
      .from('markets')
      .select('id, created_by, total_pool')
      .not('created_by', 'is', null)
      .eq('status', 'settled')
    if (startDate) marketsQuery = marketsQuery.gte('settled_at', startDate)

    const [marketsRes, earningsRes] = await Promise.all([
      marketsQuery,
      (() => {
        let q = admin
          .from('transactions')
          .select('user_id, amount')
          .eq('type', 'creator_share')
          .eq('status', 'completed')
        if (startDate) q = q.gte('created_at', startDate)
        return q
      })(),
    ])

    const creatorMarkets = (marketsRes.data ?? []).filter(m => !adminIds.has(m.created_by!))
    const earningsMap: Record<string, number> = {}
    for (const t of earningsRes.data ?? []) {
      earningsMap[t.user_id] = (earningsMap[t.user_id] ?? 0) + Number(t.amount)
    }

    // Count unique bettors per creator's markets
    const creatorMarketIds: Record<string, string[]> = {}
    for (const m of creatorMarkets) {
      if (!creatorMarketIds[m.created_by!]) creatorMarketIds[m.created_by!] = []
      creatorMarketIds[m.created_by!].push(m.id)
    }

    let bettorsByCreator: Record<string, Set<string>> = {}
    if (creatorMarkets.length > 0) {
      const allMarketIds = creatorMarkets.map(m => m.id)
      const { data: bettorBets } = await admin
        .from('bets')
        .select('market_id, user_id')
        .in('market_id', allMarketIds)
        .neq('status', 'cancelled')
      for (const b of bettorBets ?? []) {
        const creatorId = creatorMarkets.find(m => m.id === b.market_id)?.created_by
        if (!creatorId) continue
        if (!bettorsByCreator[creatorId]) bettorsByCreator[creatorId] = new Set()
        bettorsByCreator[creatorId].add(b.user_id)
      }
    }

    const creatorMap: Record<string, { marketCount: number; totalPool: number }> = {}
    for (const m of creatorMarkets) {
      if (!creatorMap[m.created_by!]) creatorMap[m.created_by!] = { marketCount: 0, totalPool: 0 }
      creatorMap[m.created_by!].marketCount++
      creatorMap[m.created_by!].totalPool += Number(m.total_pool)
    }

    creatorRows = Object.entries(creatorMap).map(([id, stats]) => {
      const p = profiles.find(x => x.id === id)
      return {
        id,
        name: displayName(p?.full_name ?? null, p?.phone ?? null),
        marketCount: stats.marketCount,
        totalPool: stats.totalPool,
        earnings: earningsMap[id] ?? 0,
        bettorCount: bettorsByCreator[id]?.size ?? 0,
      }
    }).sort((a, b) => b.totalPool - a.totalPool).slice(0, 50)

  } catch {
    // admin client unavailable
  }

  // Build per-user aggregate rows
  const adminIds = new Set(profiles.filter(p => p.is_admin).map(p => p.id))
  const map: Record<string, Row> = {}

  for (const bet of bets) {
    if (adminIds.has(bet.user_id)) continue
    if (!map[bet.user_id]) {
      const p = profiles.find(x => x.id === bet.user_id)
      map[bet.user_id] = {
        id: bet.user_id,
        name: displayName(p?.full_name ?? null, p?.phone ?? null),
        total: 0,
        wins: 0,
        losses: 0,
        staked: 0,
        received: 0,
        net: 0,
        winRate: 0,
      }
    }
    const r = map[bet.user_id]
    r.total++
    r.staked += Number(bet.amount)
    if (bet.status === 'won') {
      r.wins++
      r.received += Number(bet.settled_payout ?? 0)
    } else {
      r.losses++
    }
  }

  const rows: Row[] = Object.values(map)
    .map(r => ({
      ...r,
      net: r.received - r.staked,
      winRate:
        r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0,
    }))
    .sort((a, b) => b.net - a.net)

  const top50 = rows.slice(0, 50)
  const top3 = top50.slice(0, 3)
  const rest = top50.slice(3)

  // Current user rank
  const myRankIdx = currentUserId ? rows.findIndex(r => r.id === currentUserId) : -1
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : 0
  const myRow: Row | null = myRankIdx >= 0 ? rows[myRankIdx] : null

  // Podium order: 2nd (left) · 1st (centre) · 3rd (right)
  type PodiumEntry = { player: Row; place: 1 | 2 | 3; heightClass: string } | null
  const podiumSlots: PodiumEntry[] =
    top3.length >= 3
      ? [
          { player: top3[1], place: 2, heightClass: 'h-24' },
          { player: top3[0], place: 1, heightClass: 'h-36' },
          { player: top3[2], place: 3, heightClass: 'h-16' },
        ]
      : top3.length === 2
      ? [
          null,
          { player: top3[0], place: 1, heightClass: 'h-36' },
          { player: top3[1], place: 2, heightClass: 'h-24' },
        ]
      : top3.length === 1
      ? [null, { player: top3[0], place: 1, heightClass: 'h-36' }, null]
      : []

  const label = periodLabel(period)

  return (
    <div className={`min-h-screen bg-[#0a0a0f] ${myRow ? 'pb-20 lg:pb-0' : ''}`}>
      {/* Auto-refresh leaderboard data every 30 s without a full reload */}
      <LeaderboardRefresher />

      {/* ── Hero ── */}
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-amber-950/30 to-transparent px-4 pb-10 pt-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-500/80">
            Hall of Fame
          </p>
          <h1 className="text-4xl font-black text-white">🏆 Leaderboard</h1>
          <p className="mt-2 text-slate-500">
            Uganda&rsquo;s sharpest predictors &middot;{' '}
            <span className="text-amber-500/80">{label}</span>
          </p>

          {/* Monthly prizes banner */}
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/40 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-amber-500">
              🎁 Monthly Cash Prizes — Top 3 on Each Leaderboard
            </p>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
                <span className="text-xl">🥇</span>
                <div>
                  <p className="text-xs text-amber-600 font-bold">1st Place</p>
                  <p className="text-base font-black text-amber-300">UGX 1,000,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-700/10 border border-slate-600/30 px-4 py-2.5">
                <span className="text-xl">🥈</span>
                <div>
                  <p className="text-xs text-slate-500 font-bold">2nd Place</p>
                  <p className="text-base font-black text-slate-300">UGX 500,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-900/10 border border-amber-800/30 px-4 py-2.5">
                <span className="text-xl">🥉</span>
                <div>
                  <p className="text-xs text-amber-800 font-bold">3rd Place</p>
                  <p className="text-base font-black text-amber-700">UGX 250,000</p>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-600">Prizes paid to your wallet at end of month. Applies to both boards independently. <span className="text-amber-700 font-semibold">Prizes only activate when all top 3 on a board have combined activity exceeding UGX 500,000.</span></p>
          </div>

          {/* User rank pill */}
          <div className="mt-5">
            {myRow && myRank > 0 ? (
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-900/20 px-4 py-2.5">
                <span className="text-sm font-semibold text-amber-400">You are ranked</span>
                <span className="text-2xl font-black text-amber-300">#{myRank}</span>
                <span className="text-sm font-semibold text-amber-500">
                  {label.toLowerCase()}
                </span>
              </div>
            ) : currentUserId ? (
              <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-2.5">
                <span className="text-sm text-slate-500">
                  No settled bets yet for {label.toLowerCase()}.
                </span>
                <Link
                  href="/markets"
                  className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Browse markets →
                </Link>
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-2.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Sign in to see your rank →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* ── View switcher ── */}
        <div className="mb-5 flex gap-2">
          {(['predictors', 'creators'] as View[]).map(v => (
            <Link
              key={v}
              href={`/leaderboard?view=${v}&period=${period}`}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                view === v
                  ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                  : 'border border-[#1e1e2e] text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {v === 'predictors' ? '🎯 Predictors' : '🏗️ Creators'}
            </Link>
          ))}
        </div>

        {/* ── Period Tabs ── */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {(['all', 'month', 'week'] as Period[]).map(p => (
            <Link
              key={p}
              href={`/leaderboard?view=${view}&period=${p}`}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                period === p
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'border border-[#1e1e2e] text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {periodLabel(p)}
            </Link>
          ))}
        </div>

        {/* ── Creators view ── */}
        {view === 'creators' && (
          <>
            {creatorRows.length === 0 ? (
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] py-20 text-center">
                <p className="text-5xl">🏗️</p>
                <p className="mt-4 text-lg font-bold text-slate-400">No creator data yet</p>
                <p className="mt-2 text-sm text-slate-600">Create a market and attract bettors to appear here.</p>
                <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 transition-colors">
                  Create a market →
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
                <div className="grid grid-cols-[3rem_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-[#1e1e2e] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  <span className="text-center">#</span>
                  <span>Creator</span>
                  <span className="text-right">Markets</span>
                  <span className="hidden sm:block text-right">Bettors</span>
                  <span className="text-right">Pool&nbsp;Attracted</span>
                  <span className="text-right">Earnings</span>
                </div>
                {creatorRows.map((r, i) => {
                  const isMe = r.id === currentUserId
                  return (
                    <div
                      key={r.id}
                      className={[
                        'grid grid-cols-[3rem_1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3.5 transition-colors',
                        i < creatorRows.length - 1 ? 'border-b border-[#131320]' : '',
                        i % 2 === 1 ? 'bg-[#0f0f1a]' : 'bg-[#0d0d14]',
                        isMe ? 'bg-violet-950/30 ring-1 ring-inset ring-violet-600/30' : 'hover:bg-[#13131e]',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="text-center text-sm font-black text-slate-600 tabular-nums">{i + 1}</span>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white ${isMe ? 'bg-gradient-to-br from-violet-500 to-purple-700 ring-2 ring-violet-400/60' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
                          {getInitials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-bold ${isMe ? 'text-violet-300' : 'text-slate-200'}`}>
                            {r.name}{isMe && <span className="ml-1.5 text-[10px] font-medium text-violet-500">you</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-right text-sm font-bold text-slate-300 tabular-nums">{r.marketCount}</span>
                      <span className="hidden sm:block text-right text-xs text-slate-500 tabular-nums">{r.bettorCount}</span>
                      <span className="text-right text-sm font-bold text-amber-400 tabular-nums">
                        {r.totalPool >= 1_000_000 ? `${(r.totalPool / 1_000_000).toFixed(1)}M` : r.totalPool >= 1_000 ? `${Math.round(r.totalPool / 1_000)}k` : r.totalPool.toLocaleString()}
                      </span>
                      <span className="text-right text-sm font-black tabular-nums text-emerald-400">
                        {r.earnings > 0 ? `+${Math.round(r.earnings / 1_000)}k` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-12 text-center">
              <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500">
                Create a market to earn →
              </Link>
            </div>
          </>
        )}

        {/* ── Predictors view ── */}
        {view === 'predictors' && (rows.length === 0 ? (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] py-20 text-center">
            <p className="text-5xl">🎯</p>
            <p className="mt-4 text-lg font-bold text-slate-400">
              No data yet for {label.toLowerCase()}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Be the first to make predictions!
            </p>
            <Link
              href="/markets"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
            >
              Browse markets →
            </Link>
          </div>
        ) : (
          <>
            {/* ── Podium ── */}
            {top3.length >= 1 && (
              <div className="mb-10 rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] px-4 py-8">
                <div className="flex items-end justify-center gap-5 sm:gap-8">
                  {podiumSlots.map((slot, idx) =>
                    slot != null ? (
                      <PodiumSlot
                        key={slot.player.id}
                        player={slot.player}
                        place={slot.place}
                        heightClass={slot.heightClass}
                      />
                    ) : (
                      // Spacer for absent podium position
                      <div key={idx} className="w-28" />
                    ),
                  )}
                </div>
              </div>
            )}

            {/* ── Table (ranks 4+) ── */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
                {/* Table header */}
                <div className="grid grid-cols-[3rem_1fr_auto_auto_auto] items-center gap-3 border-b border-[#1e1e2e] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  <span className="text-center">#</span>
                  <span>Player</span>
                  <span className="hidden sm:block text-right">Bets</span>
                  <span className="text-right">Win&nbsp;%</span>
                  <span className="text-right">Net&nbsp;P&amp;L</span>
                </div>

                {/* Table rows */}
                {rest.map((r, i) => {
                  const rank = i + 4
                  const isMe = r.id === currentUserId
                  return (
                    <div
                      key={r.id}
                      className={[
                        'grid grid-cols-[3rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 transition-colors',
                        i < rest.length - 1 ? 'border-b border-[#131320]' : '',
                        i % 2 === 1 ? 'bg-[#0f0f1a]' : 'bg-[#0d0d14]',
                        isMe
                          ? 'bg-violet-950/30 ring-1 ring-inset ring-violet-600/30'
                          : 'hover:bg-[#13131e]',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {/* Rank */}
                      <span className="text-center text-sm font-black text-slate-600 tabular-nums">
                        {rank}
                      </span>

                      {/* Avatar + name */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white',
                            isMe
                              ? 'bg-gradient-to-br from-violet-500 to-purple-700 ring-2 ring-violet-400/60'
                              : 'bg-gradient-to-br from-slate-600 to-slate-800',
                          ].join(' ')}
                        >
                          {getInitials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-bold ${
                              isMe ? 'text-violet-300' : 'text-slate-200'
                            }`}
                          >
                            {r.name}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] font-medium text-violet-500">
                                you
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {r.wins}W&nbsp;&middot;&nbsp;{r.losses}L
                          </p>
                        </div>
                      </div>

                      {/* Bet count */}
                      <span className="hidden sm:block text-right text-xs text-slate-500 tabular-nums">
                        {r.total}
                      </span>

                      {/* Win rate */}
                      <span className="text-right text-sm font-bold text-violet-400 tabular-nums">
                        {r.winRate}%
                      </span>

                      {/* Net P&L */}
                      <span
                        className={`text-right text-sm font-black tabular-nums ${
                          r.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtNet(r.net)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── My stats card (inline, desktop / also mobile when not fixed) ── */}
            {myRow && myRank > 3 && (
              <div className="mt-8 hidden lg:block rounded-2xl border border-violet-700/40 bg-gradient-to-r from-violet-900/15 to-purple-900/10 p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500">
                  Your Standing &middot; {label}
                </p>
                <MyStatsInner row={myRow} rank={myRank} />
              </div>
            )}

            {/* Also highlight if user is in top 3 */}
            {myRow && myRank <= 3 && (
              <div className="mt-8 rounded-2xl border border-amber-700/30 bg-amber-900/10 p-4 flex items-center gap-3">
                <span className="text-2xl">
                  {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : '🥉'}
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-300">
                    You&rsquo;re on the podium! #{myRank}&nbsp;{label.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {myRow.wins}W &middot; {myRow.losses}L &middot; {myRow.winRate}% win rate
                    &nbsp;&middot;&nbsp;Net: {fmtNet(myRow.net)}
                  </p>
                </div>
              </div>
            )}
          </>
        ))}

        {/* ── CTA ── */}
        {view === 'predictors' && (
          <div className="mt-12 text-center">
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Make your predictions →
            </Link>
          </div>
        )}
      </div>

      {/* ── Fixed bottom bar on mobile (logged-in users only, predictors view) ── */}
      {view === 'predictors' && myRow && myRank > 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#1e1e2e] bg-[#0a0a0f]/95 px-4 py-3 backdrop-blur-md">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-violet-500">
            Your Standing &middot; {label}
          </p>
          <MyStatsInner row={myRow} rank={myRank} compact />
        </div>
      )}
    </div>
  )
}

// ─── Shared "my stats" inner layout ──────────────────────────────────────────

function MyStatsInner({
  row,
  rank,
  compact = false,
}: {
  row: Row
  rank: number
  compact?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-black text-white shadow-lg shadow-violet-900/40">
          {getInitials(row.name)}
        </div>
        {!compact && (
          <div>
            <p className="font-bold text-violet-200">{row.name}</p>
            <p className="text-xs text-slate-500">
              {row.wins}W &middot; {row.losses}L &middot; {row.winRate}% win rate
            </p>
          </div>
        )}
        {compact && (
          <div>
            <p className="text-sm font-bold text-violet-200">{row.name}</p>
            <p className="text-[11px] text-slate-500">
              {row.wins}W &middot; {row.losses}L
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-black text-violet-300">#{rank}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Rank</p>
        </div>
        <div className="text-center">
          <p
            className={`font-black tabular-nums ${
              compact ? 'text-base' : 'text-xl'
            } ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {fmtNet(row.net)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Net P&amp;L
          </p>
        </div>
        <div className="text-center">
          <p className={`font-black text-violet-400 tabular-nums ${compact ? 'text-base' : 'text-xl'}`}>
            {row.total}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Bets</p>
        </div>
      </div>
    </div>
  )
}
