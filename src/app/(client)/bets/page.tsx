'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type BetStatus = 'active' | 'won' | 'lost' | 'cancelled' | 'exited'
type Category = 'football' | 'politics' | 'economy' | 'entertainment' | 'tech' | 'infrastructure' | 'agriculture' | 'default'

interface Market {
  id: string
  title: string
  description: string | null
  status: string
  options: Array<{ id: string; label: string; total_pool: number }>
  winning_option_id: string | null
  closes_at: string | null
}

interface Bet {
  id: string
  market_id: string
  option_id: string
  amount: number
  potential_payout: number
  settled_payout: number | null
  status: BetStatus
  placed_at: string
  markets: Market
}

function detectCategory(title: string, desc = ''): Category {
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|premier.?league|fufa|kcca.*fc|vipers|express.?fc|cranes|afcon|scorer|derby|sc.villa|bul.fc/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|social.?media.?tax|vote|contest/.test(t)) return 'politics'
  if (/oil|exchange.?rate|ugx.*usd|usd.*ugx|bank.*branch|share.?price|startup.?fund|largest.?fund|mtn.?uganda.?share|robusta|farmgate|coffee/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|eddy.?kenzo|chameleone|fik.?fameica|pallaso|winnie.?nwagi|headline/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel.?money|mtn.?momo|telecom|users.?in.?uganda/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road.?repair|kampala.*jinja/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|long.?rains/.test(t)) return 'agriculture'
  return 'default'
}

const CAT: Record<Category, {
  icon: string; label: string; color: string
  glow: string; border: string
  tag: { background: string; color: string }
}> = {
  football:       { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.07)',  border: 'rgba(163,230,53,0.25)', tag: { background: 'rgba(163,230,53,0.15)', color: '#d9f99d' } },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.25)',  tag: { background: 'rgba(96,165,250,0.15)',  color: '#bfdbfe' } },
  economy:        { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.25)',  tag: { background: 'rgba(251,191,36,0.15)',  color: '#fde68a' } },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.07)', border: 'rgba(244,114,182,0.25)', tag: { background: 'rgba(244,114,182,0.15)', color: '#fbcfe8' } },
  tech:           { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.07)',  border: 'rgba(34,211,238,0.25)',  tag: { background: 'rgba(34,211,238,0.15)',  color: '#a5f3fc' } },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#fb923c', glow: 'rgba(251,146,60,0.07)',  border: 'rgba(251,146,60,0.25)',  tag: { background: 'rgba(251,146,60,0.15)',  color: '#fed7aa' } },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.25)',  tag: { background: 'rgba(52,211,153,0.15)',  color: '#a7f3d0' } },
  default:        { icon: '🔮', label: 'Prediction',     color: '#a78bfa', glow: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.25)', tag: { background: 'rgba(167,139,250,0.15)', color: '#ddd6fe' } },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-sky-900/40 text-sky-400 border border-sky-800/40' },
  won:       { label: 'Won ✓',    cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' },
  lost:      { label: 'Lost',      cls: 'bg-red-900/30 text-red-400 border border-red-800/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-800 text-slate-500 border border-slate-700/50' },
  exited:    { label: 'Exited',    cls: 'bg-amber-900/30 text-amber-400 border border-amber-800/30' },
}

const TAB_FILTERS: Record<string, (b: Bet) => boolean> = {
  all:    () => true,
  active: b => b.status === 'active',
  won:    b => b.status === 'won',
  lost:   b => b.status === 'lost' || b.status === 'exited',
}

export default function BetsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [bets, setBets]           = useState<Bet[]>([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [tab, setTab]             = useState<'all' | 'active' | 'won' | 'lost'>('all')
  const [exitingBet, setExitingBet] = useState<string | null>(null)
  const [exitLoading, setExitLoading] = useState(false)
  const [exitMsg, setExitMsg]     = useState<{ betId: string; text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const { data, error } = await supabase
        .from('bets')
        .select('id, market_id, option_id, amount, potential_payout, settled_payout, status, placed_at, markets(id, title, description, status, options, winning_option_id, closes_at)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false })

      if (error) {
        setFetchError(error.message)
      } else {
        setBets((data as unknown as Bet[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleExit(bet: Bet) {
    setExitLoading(true)
    const res = await fetch('/api/bet/exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betId: bet.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setBets(bs => bs.map(b => b.id === bet.id ? { ...b, status: 'exited' } : b))
      setExitMsg({ betId: bet.id, text: `Cashed out — UGX ${Number(data.cashout).toLocaleString()} returned to your wallet.`, ok: true })
      setExitingBet(null)
    } else {
      setExitMsg({ betId: bet.id, text: data.error ?? 'Exit failed', ok: false })
    }
    setExitLoading(false)
  }

  const filtered = bets.filter(TAB_FILTERS[tab])
  const totalStaked = bets.reduce((s, b) => s + Number(b.amount), 0)
  const totalWon = bets.filter(b => b.status === 'won').reduce((s, b) => s + Number(b.potential_payout), 0)
  const activeCount = bets.filter(b => b.status === 'active').length
  const netReturn = totalWon - totalStaked

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-slate-500 text-sm">Loading your predictions…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Page header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-white">My </span>
            <span className="text-violet-400">Predictions</span>
          </h1>
          <p className="mt-2 text-slate-500">
            {bets.length} prediction{bets.length !== 1 ? 's' : ''} placed
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Summary stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
            <p className="text-2xl font-black text-violet-400">{bets.length}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
          </div>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
            <p className="text-2xl font-black text-sky-400">{activeCount}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</p>
          </div>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
            <p className="text-2xl font-black text-slate-300">
              {totalStaked >= 1_000_000
                ? `${(totalStaked / 1_000_000).toFixed(1)}M`
                : totalStaked >= 1_000
                ? `${(totalStaked / 1_000).toFixed(1)}k`
                : totalStaked.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Staked (UGX)</p>
          </div>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
            <p className={`text-2xl font-black ${netReturn > 0 ? 'text-emerald-400' : netReturn < 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {netReturn >= 0 ? '+' : ''}
              {Math.abs(netReturn) >= 1_000_000
                ? `${(netReturn / 1_000_000).toFixed(1)}M`
                : Math.abs(netReturn) >= 1_000
                ? `${(netReturn / 1_000).toFixed(1)}k`
                : netReturn.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Net P&L (UGX)</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex w-fit gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1">
          {(['all', 'active', 'won', 'lost'] as const).map(t => {
            const count = bets.filter(TAB_FILTERS[t]).length
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t !== 'all' && count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    tab === t ? 'bg-white/20 text-white' : 'bg-[#1e1e2e] text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            Failed to load bets: {fetchError}
          </div>
        )}

        {/* Bet list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2a2a3e] bg-[#0d0d14] p-16 text-center">
            <p className="mb-2 text-4xl">🔮</p>
            <p className="font-medium text-slate-400">
              {tab === 'all' ? 'No predictions yet.' : `No ${tab} predictions.`}
            </p>
            {tab === 'all' && (
              <Link
                href="/markets"
                className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Browse open markets →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(bet => {
              const market = bet.markets
              const cat = CAT[detectCategory(market?.title ?? '', market?.description ?? '')]
              const opts = (market?.options ?? []) as Array<{ id: string; label: string; total_pool: number }>
              const chosenOpt = opts.find(o => o.id === bet.option_id)
              const winnerOpt = opts.find(o => o.id === market?.winning_option_id)
              const isWon    = bet.status === 'won'
              const isActive = bet.status === 'active'
              const isExited = bet.status === 'exited'
              const statusCfg = STATUS_CONFIG[bet.status] ?? STATUS_CONFIG.cancelled

              const canExit = isActive && market?.status === 'open' &&
                (!market.closes_at || new Date(market.closes_at) > new Date())
              const cashoutPreview = Math.round(Number(bet.amount) * 0.85)
              const isConfirming = exitingBet === bet.id
              const msg = exitMsg?.betId === bet.id ? exitMsg : null

              return (
                <div key={bet.id} className="space-y-1.5">
                  <Link
                    href={`/markets/${bet.market_id}`}
                    className="group block overflow-hidden rounded-xl border transition-all duration-150 hover:brightness-110"
                    style={{
                      borderColor: cat.border,
                      background: `linear-gradient(135deg, ${cat.glow} 0%, #13131a 55%)`,
                    }}
                  >
                    {/* Category colour top strip */}
                    <div
                      className="h-[3px] w-full"
                      style={{ background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}30 100%)` }}
                    />

                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                      {/* Category icon bubble */}
                      <div
                        className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl text-xl"
                        style={{ background: cat.tag.background }}
                      >
                        {cat.icon}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={cat.tag}
                          >
                            {cat.icon} {cat.label}
                          </span>
                          {isActive && market?.closes_at && (
                            <span className="text-[10px] text-slate-600">
                              Closes {new Date(market.closes_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>

                        {/* Market title */}
                        <p className="font-bold leading-snug text-slate-100 group-hover:text-white transition-colors"
                           style={{ fontSize: '0.95rem' }}>
                          {market?.title ?? bet.market_id}
                        </p>

                        {/* Pick + winner + date */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Picked:{' '}
                            <span className="font-semibold" style={{ color: cat.color }}>
                              {chosenOpt?.label ?? bet.option_id}
                            </span>
                          </span>
                          {!isActive && winnerOpt && !isExited && (
                            <span>
                              Winner:{' '}
                              <span className={`font-semibold ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
                                {winnerOpt.label}
                              </span>
                            </span>
                          )}
                          <span>
                            {new Date(bet.placed_at).toLocaleDateString('en-UG', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Amount / payout */}
                      <div className="shrink-0 text-right sm:border-l sm:border-[#1e1e2e] sm:pl-5">
                        <p className="text-base font-black text-slate-200">
                          UGX {Number(bet.amount).toLocaleString()}
                        </p>
                        {isWon ? (
                          <p className="mt-0.5 text-sm font-bold text-emerald-400">
                            +UGX {Number(bet.potential_payout).toLocaleString()}
                          </p>
                        ) : isActive ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            est.{' '}
                            <span className="font-semibold" style={{ color: cat.color }}>
                              UGX {Number(bet.potential_payout).toLocaleString()}
                            </span>
                          </p>
                        ) : isExited ? (
                          <p className="mt-0.5 text-xs font-semibold text-amber-400">
                            Returned UGX {Number(bet.settled_payout ?? 0).toLocaleString()}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs font-medium text-red-400">Lost</p>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Exit controls — only for eligible active bets */}
                  {canExit && (
                    <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3">
                      {msg && (
                        <p className={`mb-2 text-xs font-semibold ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
                      )}
                      {!isConfirming ? (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            Exit early · get back{' '}
                            <span className="font-bold text-amber-400">UGX {cashoutPreview.toLocaleString()}</span>
                            <span className="text-slate-700"> (85% of stake)</span>
                          </p>
                          <button
                            onClick={() => { setExitingBet(bet.id); setExitMsg(null) }}
                            className="shrink-0 rounded-lg border border-amber-800/40 bg-amber-900/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/40 transition-colors"
                          >
                            Cash out →
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-amber-300">
                            Confirm: receive <span className="text-white">UGX {cashoutPreview.toLocaleString()}</span> now?
                          </p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleExit(bet)}
                              disabled={exitLoading}
                              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
                            >
                              {exitLoading ? '…' : 'Yes, exit'}
                            </button>
                            <button
                              onClick={() => setExitingBet(null)}
                              className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs text-slate-500 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
