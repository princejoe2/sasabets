'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WinCelebration from '@/components/WinCelebration'

// ── My Markets types ──────────────────────────────────────────────────────────
interface CreatedMarket {
  id: string
  title: string
  status: string
  total_pool: number
  created_at: string
  metadata: Record<string, unknown> | null
}

function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

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
  active:    { label: 'In play',   cls: 'bg-amber-900/30 text-amber-400 border border-amber-800/30 animate-pulse' },
  won:       { label: 'Won 🏆',    cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' },
  lost:      { label: 'Lost',      cls: 'bg-red-900/30 text-red-400 border border-red-800/30' },
  cancelled: { label: 'Refunded',  cls: 'bg-slate-800 text-slate-500 border border-slate-700/50' },
  exited:    { label: 'Exited',    cls: 'bg-orange-900/30 text-orange-400 border border-orange-800/30' },
}

const TAB_FILTERS: Record<string, (b: Bet) => boolean> = {
  all:    () => true,
  active: b => b.status === 'active',
  won:    b => b.status === 'won',
  lost:   b => b.status === 'lost' || b.status === 'exited',
}

function sendSettlementNotification(status: 'won' | 'lost', marketTitle: string, payout?: number) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  navigator.serviceWorker.ready.then(reg => {
    const isWin = status === 'won'
    reg.showNotification(isWin ? '🏆 You won!' : '😔 Prediction settled', {
      body: isWin
        ? `You won UGX ${(payout ?? 0).toLocaleString()} on "${marketTitle}"! Tap to see your winnings.`
        : `"${marketTitle}" has settled. Better luck next time!`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `settlement-${Date.now()}`,
      data: { url: '/bets' },
    })
  })
}

export default function BetsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [bets, setBets]           = useState<Bet[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [tab, setTab]             = useState<'all' | 'active' | 'won' | 'lost' | 'mymarkets'>('all')
  const [exitingBet, setExitingBet] = useState<string | null>(null)
  const [exitLoading, setExitLoading] = useState(false)
  const [exitMsg, setExitMsg]     = useState<{ betId: string; text: string; ok: boolean } | null>(null)
  const [celebration, setCelebration] = useState<{ marketTitle: string; payout: number } | null>(null)

  // My Markets state
  const [myMarkets, setMyMarkets]           = useState<CreatedMarket[]>([])
  const [myMarketsLoaded, setMyMarketsLoaded] = useState(false)
  const [copiedId, setCopiedId]             = useState<string | null>(null)
  const [visibilityLoading, setVisibilityLoading] = useState<string | null>(null)
  const [extendingId, setExtendingId]       = useState<string | null>(null)
  const [extendDate, setExtendDate]         = useState('')
  const [extendLoading, setExtendLoading]   = useState(false)
  const [extendMsg, setExtendMsg]           = useState<{ id: string; text: string; ok: boolean } | null>(null)

  const loadBets = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('bets')
      .select('id, market_id, option_id, amount, potential_payout, settled_payout, status, placed_at, markets(id, title, description, status, options, winning_option_id, closes_at)')
      .eq('user_id', uid)
      .order('placed_at', { ascending: false })
    if (error) setFetchError(error.message)
    else setBets((data as unknown as Bet[]) ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyMarkets = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('markets')
      .select('id, title, status, total_pool, created_at, metadata')
      .eq('created_by', uid)
      .order('created_at', { ascending: false })
    setMyMarkets((data as CreatedMarket[]) ?? [])
    setMyMarketsLoaded(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      setUserId(user.id)
      await loadBets(user.id)
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On first load, mark all existing 'won' bets as already-seen so we don't
  // re-show the celebration for bets that were already won before this session.
  useEffect(() => {
    if (bets.length > 0) {
      const wonIds = bets.filter(b => b.status === 'won').map(b => b.id)
      sessionStorage.setItem('seen-won-bets', JSON.stringify(wonIds))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription: update bet status live when markets settle
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`bets-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bets', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Only update the changed bet's own fields; preserve the joined `markets` data
          setBets(prev => prev.map(b =>
            b.id === (payload.new as { id: string }).id
              ? { ...b, ...(payload.new as Partial<Bet>) }
              : b
          ))

          // Trigger win celebration for real-time won bets not already seen
          if ((payload.new as { status: string }).status === 'won' &&
              (payload.old as { status?: string } | undefined)?.status !== 'won') {
            const betId = (payload.new as { id: string }).id
            const seenRaw = sessionStorage.getItem('seen-won-bets')
            const seen: string[] = seenRaw ? JSON.parse(seenRaw) : []
            if (!seen.includes(betId)) {
              setBets(prev => {
                const wonBet = prev.find(b => b.id === betId)
                const title = wonBet?.markets?.title ?? 'your market'
                const payout = Number((payload.new as { settled_payout?: number }).settled_payout ?? 0)
                if (payout > 0) setCelebration({ marketTitle: title, payout })
                return prev
              })
            }
          }

          // Push notification for won or lost settlement transitions
          const newStatus = (payload.new as { status: string }).status
          const oldStatus = (payload.old as { status?: string } | undefined)?.status ?? ''
          if (['won', 'lost'].includes(newStatus) && !['won', 'lost'].includes(oldStatus)) {
            const betId = (payload.new as { id: string }).id
            const payout = Number((payload.new as { settled_payout?: number }).settled_payout ?? 0)
            setBets(prev => {
              const settledBet = prev.find(b => b.id === betId)
              const title = settledBet?.markets?.title ?? 'Your prediction'
              sendSettlementNotification(newStatus as 'won' | 'lost', title, payout)
              return prev
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bets', filter: `user_id=eq.${userId}` },
        () => {
          // Re-fetch so the new bet includes its joined market data
          loadBets(userId)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(t: typeof tab) {
    setTab(t)
    if (t === 'mymarkets' && !myMarketsLoaded && userId) loadMyMarkets(userId)
  }

  async function toggleVisibility(market: CreatedMarket) {
    const meta = (market.metadata ?? {}) as Record<string, unknown>
    const isCurrentlyPrivate = meta.private === true
    setVisibilityLoading(market.id)
    const res = await fetch('/api/market/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, isPrivate: !isCurrentlyPrivate }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyMarkets(prev => prev.map(m => {
        if (m.id !== market.id) return m
        const prevMeta = (m.metadata ?? {}) as Record<string, unknown>
        if (data.isPrivate) {
          return { ...m, metadata: { ...prevMeta, private: true, access_token: data.accessToken } }
        } else {
          const { private: _p, access_token: _t, ...rest } = prevMeta
          return { ...m, metadata: rest }
        }
      }))
    }
    setVisibilityLoading(null)
  }

  // The server stores only a hash of the access token, so a raw token is only
  // available in local state right after toggling. For private markets loaded
  // fresh, rotate the token via the visibility API to get a shareable link.
  async function ensureToken(market: CreatedMarket): Promise<string | null> {
    const meta = (market.metadata ?? {}) as Record<string, unknown>
    if (meta.private !== true) return null
    const existing = meta.access_token as string | undefined
    if (existing) return existing
    const res = await fetch('/api/market/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, isPrivate: true }),
    })
    const data = await res.json()
    if (!res.ok || !data.accessToken) return null
    setMyMarkets(prev => prev.map(m => {
      if (m.id !== market.id) return m
      const prevMeta = (m.metadata ?? {}) as Record<string, unknown>
      return { ...m, metadata: { ...prevMeta, private: true, access_token: data.accessToken } }
    }))
    return data.accessToken as string
  }

  async function copyMarketLink(market: CreatedMarket) {
    const token = await ensureToken(market)
    const url = token
      ? `https://sabula256.com/markets/${market.id}?t=${token}`
      : `https://sabula256.com/markets/${market.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(market.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function shareWhatsApp(market: CreatedMarket) {
    const meta = (market.metadata ?? {}) as Record<string, unknown>
    const isPriv = meta.private === true
    const token = await ensureToken(market)
    const shareUrl = token
      ? `https://sabula256.com/markets/${market.id}?t=${token}`
      : `https://sabula256.com/markets/${market.id}`
    const waText = encodeURIComponent(
      isPriv
        ? `I created a private prediction market: "${market.title}" — join with my secret link: ${shareUrl}`
        : `Join my prediction market on Sabula 256: "${market.title}" — ${shareUrl}`
    )
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener,noreferrer')
  }

  async function handleExtendDate(marketId: string) {
    if (!extendDate) return
    setExtendLoading(true)
    const res = await fetch(`/api/market/${marketId}/extend-date`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newClosingDate: extendDate }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyMarkets(prev => prev.map(m => m.id === marketId ? { ...m } : m))
      setExtendMsg({ id: marketId, text: 'Closing date updated!', ok: true })
      setExtendingId(null); setExtendDate('')
    } else {
      setExtendMsg({ id: marketId, text: data.error ?? 'Failed', ok: false })
    }
    setExtendLoading(false)
  }

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

  const filtered = bets.filter(TAB_FILTERS[tab] ?? (() => false))
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
      {celebration && (
        <WinCelebration
          marketTitle={celebration.marketTitle}
          payout={celebration.payout}
          onClose={() => setCelebration(null)}
        />
      )}
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
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1 w-fit">
          {(['all', 'active', 'won', 'lost'] as const).map(t => {
            const count = bets.filter(TAB_FILTERS[t]).length
            return (
              <button
                key={t}
                onClick={() => switchTab(t)}
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
          <button
            onClick={() => switchTab('mymarkets')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'mymarkets' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Markets
          </button>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            Failed to load bets: {fetchError}
          </div>
        )}

        {/* ── My Markets panel ── */}
        {tab === 'mymarkets' && (
          <div className="space-y-3">
            {!myMarketsLoaded ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              </div>
            ) : myMarkets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2a2a3e] bg-[#0d0d14] p-16 text-center">
                <p className="mb-2 text-4xl">💡</p>
                <p className="font-medium text-slate-400">You haven&apos;t created any markets yet.</p>
                <Link href="/create" className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Create your first market →
                </Link>
              </div>
            ) : (
              myMarkets.map(market => {
                const meta    = (market.metadata ?? {}) as Record<string, unknown>
                const isPriv  = meta.private === true
                const token   = meta.access_token as string | undefined
                const isCopied  = copiedId === market.id
                const isToggling = visibilityLoading === market.id

                const statusColor =
                  market.status === 'open'               ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40' :
                  market.status === 'settled'            ? 'text-slate-400 bg-[#1e1e2e] border-[#2a2a3e]' :
                  market.status === 'pending_approval'   ? 'text-amber-300 bg-amber-900/30 border-amber-700/50' :
                  'text-amber-400 bg-amber-900/20 border-amber-800/30'

                const statusLabel =
                  market.status === 'pending_approval' ? '🕐 Under Review' : market.status

                return (
                  <div key={market.id} className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 p-5 pb-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            isPriv
                              ? 'border-amber-700/40 bg-amber-900/20 text-amber-400'
                              : 'border-[#2a2a3e] text-slate-500'
                          }`}>
                            {isPriv ? '🔒 Private' : '🌍 Public'}
                          </span>
                          <span className="text-[10px] text-slate-600">{fmtPool(Number(market.total_pool))} pool</span>
                        </div>
                        <p className="font-bold text-slate-100 leading-snug">{market.title}</p>
                      </div>
                      <Link
                        href={isPriv && token ? `/markets/${market.id}?t=${token}` : `/markets/${market.id}`}
                        className="shrink-0 rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-violet-600 transition-colors"
                      >
                        View →
                      </Link>
                    </div>

                    {/* Link + actions */}
                    <div className="border-t border-[#1a1a2a] px-5 py-3 space-y-2">
                      {/* Link row */}
                      <div className="flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2">
                        <span className="flex-1 truncate font-mono text-[11px] text-slate-500">
                          {isPriv
                            ? token
                              ? `sabula256.com/markets/${market.id}?t=${token}`
                              : `sabula256.com/markets/${market.id}?t=•••• (tap Copy for the secret link)`
                            : `sabula256.com/markets/${market.id}`}
                        </span>
                        <button
                          onClick={() => copyMarketLink(market)}
                          className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            isCopied
                              ? 'bg-emerald-700/30 text-emerald-400'
                              : 'bg-violet-900/30 text-violet-400 hover:bg-violet-800/40'
                          }`}
                        >
                          {isCopied ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => shareWhatsApp(market)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 px-3 py-1.5 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Share
                        </button>

                        {market.status !== 'settled' && (
                          <button
                            onClick={() => toggleVisibility(market)}
                            disabled={isToggling}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                              isPriv
                                ? 'border-slate-700/40 text-slate-500 hover:border-emerald-700/40 hover:text-emerald-400'
                                : 'border-amber-800/30 text-amber-500/70 hover:border-amber-700/60 hover:text-amber-400'
                            }`}
                          >
                            {isToggling ? '…' : isPriv ? '🌍 Make public' : '🔒 Make private'}
                          </button>
                        )}
                        {market.status === 'open' && (
                          <button
                            onClick={() => { setExtendingId(market.id); setExtendDate(''); setExtendMsg(null) }}
                            className="flex items-center gap-1.5 rounded-lg border border-sky-800/30 px-3 py-1.5 text-[11px] font-bold text-sky-500/70 hover:border-sky-600 hover:text-sky-400 transition-colors"
                          >
                            ⏰ Extend date
                          </button>
                        )}
                      </div>

                      {isPriv && (
                        <p className="text-[10px] text-amber-700/70 leading-relaxed">
                          Only people with the link above can view and bet. Without it, the market is invisible.
                        </p>
                      )}

                      {/* Extend date inline form */}
                      {extendingId === market.id && (
                        <div className="rounded-lg border border-sky-800/30 bg-sky-900/10 p-3 space-y-2">
                          {extendMsg?.id === market.id && (
                            <p className={`text-[11px] font-semibold ${extendMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{extendMsg.text}</p>
                          )}
                          <p className="text-[11px] text-sky-400 font-semibold">Choose new closing date (must be in the future)</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={extendDate}
                              min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                              onChange={e => setExtendDate(e.target.value)}
                              className="flex-1 rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-3 py-1.5 text-xs text-white outline-none focus:border-sky-600"
                            />
                            <button
                              onClick={() => handleExtendDate(market.id)}
                              disabled={!extendDate || extendLoading}
                              className="rounded-lg bg-sky-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40 hover:bg-sky-600 transition-colors"
                            >
                              {extendLoading ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setExtendingId(null)}
                              className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-[11px] text-slate-500 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {extendMsg?.id === market.id && extendingId !== market.id && (
                        <p className={`text-[11px] font-semibold ${extendMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{extendMsg.text}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Bet list */}
        {tab !== 'mymarkets' && (filtered.length === 0 ? (
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
              const cashoutPreview = Math.round(Number(bet.amount) * 0.75)
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
                            <span className="text-slate-700"> (75% of stake · 25% exit fee)</span>
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
        ))}
      </div>
    </div>
  )
}
