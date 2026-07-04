'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PriceWidget from '@/components/PriceWidget'
import { createClient } from '@/lib/supabase/client'
import OddsChart from '@/components/OddsChart'
import MarketComments from '@/components/MarketComments'
import BetDistribution from '@/components/BetDistribution'
import RecentBets from '@/components/RecentBets'
import { getPoolDepth, DEPTH_BADGE } from '@/lib/pool-depth'
import { getEntityLogo, getEntityLogoFromTitle } from '@/lib/entity-logos'
import EntityLogo from '@/components/EntityLogo'

function friendlyBetError(data: Record<string, unknown>): string {
  const code = data.code as string | undefined
  const fmt  = (n: unknown) => Number(n).toLocaleString()

  switch (code) {
    case 'market_not_open':
      return `This market is no longer accepting bets (status: ${data.status ?? 'closed'}).`
    case 'market_suspended':
      return 'This market has been temporarily suspended for review. Check back soon.'
    case 'betting_closed':
      return 'Betting on this market has closed. The result will be announced shortly.'
    case 'insufficient_balance':
      return `Your wallet has UGX ${fmt(data.balance)} but this bet needs UGX ${fmt(data.required)}. Top up your wallet first.`
    case 'account_too_new':
      return `New accounts can only bet up to UGX 50,000 per prediction for the first 72 hours. Your limit right now is UGX ${fmt(data.max_allowed)}.`
    case 'position_limit': {
      const max = Number(data.max_additional_allowed ?? 0)
      return max > 0
        ? `You already hold a large share of this side. You can add up to UGX ${fmt(max)} more on this outcome.`
        : 'You have reached the maximum allowed stake on this side of the market.'
    }
    case 'bet_too_large':
      return `That bet is too large for the current pool size. Maximum single bet is UGX ${fmt(data.max_allowed)}.`
    case 'surge_cap':
      return `Unusual activity was detected on this market. Your bets here are capped at UGX ${fmt(data.max_allowed)} until the review clears.`
    case 'too_many_bets':
      return 'You have placed too many bets on this market in the last hour. Please wait 15 minutes before trying again.'
    default:
      return (data.message as string) || (data.error as string) || 'Something went wrong. Please try again.'
  }
}

type PreviewResult = {
  estimated_payout: number
  estimated_profit: number
  estimated_roi_pct: number
  probability_if_placed: number
  probability_current: number
  probability_shift_pct: number
  pool_depth_after: string
  pool_depth_warning: string | null
  warning: 'large_bet_moves_market' | 'thin_pool_estimate_unreliable' | null
}

type Option = { id: string; label: string; total_pool: number }
type Market = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: Option[]
  closes_at: string | null
  status: string
  rake_pct: number
  winning_option_id: string | null
  settlement_note: string | null
  settlement_evidence_url: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
}

type Category = 'football' | 'politics' | 'economy' | 'entertainment' | 'tech' | 'infrastructure' | 'agriculture' | 'default'

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

const CAT = {
  football:       { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.08)',  border: 'rgba(163,230,53,0.28)', bar: '#84cc16', tag: { background: 'rgba(163,230,53,0.15)', color: '#d9f99d' } },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.28)',  bar: '#3b82f6', tag: { background: 'rgba(96,165,250,0.15)',  color: '#bfdbfe' } },
  economy:        { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.28)',  bar: '#f59e0b', tag: { background: 'rgba(251,191,36,0.15)',  color: '#fde68a' } },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.28)', bar: '#ec4899', tag: { background: 'rgba(244,114,182,0.15)', color: '#fbcfe8' } },
  tech:           { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.28)',  bar: '#06b6d4', tag: { background: 'rgba(34,211,238,0.15)',  color: '#a5f3fc' } },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#fb923c', glow: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.28)',  bar: '#f97316', tag: { background: 'rgba(251,146,60,0.15)',  color: '#fed7aa' } },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.28)',  bar: '#10b981', tag: { background: 'rgba(52,211,153,0.15)',  color: '#a7f3d0' } },
  default:        { icon: '🔮', label: 'Prediction',     color: '#a78bfa', glow: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.28)', bar: '#8b5cf6', tag: { background: 'rgba(167,139,250,0.15)', color: '#ddd6fe' } },
}

// Category hero background images (same URLs as MarketCard)
const CAT_IMAGE: Record<Category, string> = {
  football:       'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=60&auto=format&fit=crop',
  politics:       'https://images.unsplash.com/photo-1529107386316-0d2ef31753c0?w=1200&q=60&auto=format&fit=crop',
  economy:        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=60&auto=format&fit=crop',
  entertainment:  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=60&auto=format&fit=crop',
  tech:           'https://images.unsplash.com/photo-1512941937938-2bdb01e0f36f?w=1200&q=60&auto=format&fit=crop',
  infrastructure: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=60&auto=format&fit=crop',
  agriculture:    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=60&auto=format&fit=crop',
  default:        'https://images.unsplash.com/photo-1518373714866-3f1b98b28e34?w=1200&q=60&auto=format&fit=crop',
}

const CRYPTO_ICONS: Record<string, string> = {
  bitcoin:      'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ethereum:     'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  solana:       'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  binancecoin:  'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  ripple:       'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  cardano:      'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  dogecoin:     'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  polkadot:     'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  avalanche:    'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  tether:       'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  'usd-coin':   'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  chainlink:    'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  'shiba-inu':  'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
}

type SideVisualData =
  | { kind: 'crypto'; url: string; dir: 'up' | 'down' | null }
  | { kind: 'bool';   yes: boolean }
  | { kind: 'avatar'; initials: string; color: string }

function resolveVisual(
  label: string,
  meta: Record<string, unknown>,
  color: string,
): SideVisualData {
  const l = label.toLowerCase().trim()

  if (meta.type === 'updown') {
    const asset = String(meta.asset ?? 'bitcoin')
    const url   = CRYPTO_ICONS[asset]
    if (url) {
      const dir = l.includes('up') ? 'up' : l.includes('down') ? 'down' : null
      return { kind: 'crypto', url, dir }
    }
  }

  if (l === 'yes') return { kind: 'bool', yes: true }
  if (l === 'no')  return { kind: 'bool', yes: false }

  const words    = label.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : label.slice(0, 2).toUpperCase()
  return { kind: 'avatar', initials, color }
}

function SideVisual({ v }: { v: SideVisualData }) {
  if (v.kind === 'crypto') {
    return (
      <div className="relative mb-3 h-16 w-16 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.url} alt="asset icon" className="h-full w-full rounded-full object-cover" />
        {v.dir && (
          <span
            className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white ${
              v.dir === 'up' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {v.dir === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>
    )
  }

  if (v.kind === 'bool') {
    return (
      <div
        className={`mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl font-black ${
          v.yes ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {v.yes ? '✓' : '✕'}
      </div>
    )
  }

  return (
    <div
      className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-black"
      style={{ background: `${v.color}18`, color: v.color, border: `2px solid ${v.color}35` }}
    >
      {v.initials}
    </div>
  )
}

function useCountdown(closesAt: string | null) {
  const [display, setDisplay] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'soon' | 'urgent'>('normal')
  useEffect(() => {
    if (!closesAt) return
    function update() {
      const diff = new Date(closesAt!).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Closed'); setUrgency('urgent'); return }
      const days = Math.floor(diff / 86_400_000)
      const hours = Math.floor((diff % 86_400_000) / 3_600_000)
      const mins = Math.floor((diff % 3_600_000) / 60_000)
      const secs = Math.floor((diff % 60_000) / 1_000)
      if (days >= 7)       { setDisplay(`${days}d left`);             setUrgency('normal') }
      else if (days >= 1)  { setDisplay(`${days}d ${hours}h left`);   setUrgency('soon') }
      else if (hours >= 1) { setDisplay(`${hours}h ${mins}m left`);   setUrgency('urgent') }
      else                 { setDisplay(`${mins}m ${secs}s left`);    setUrgency('urgent') }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [closesAt])
  return { display, urgency }
}

export default function BetPanel({
  market,
  initialBalance,
  initialPick,
  isLoggedIn,
  userBet,
  predictorCount,
  accessToken,
  creatorInfo,
}: {
  market: Market
  initialBalance: number | null
  initialPick: string | null
  isLoggedIn: boolean
  userBet: { option_id: string; amount: number } | null
  predictorCount: number
  accessToken?: string | null
  creatorInfo?: { name: string; verified: boolean } | null
}) {
  const router = useRouter()
  const opts = market.options as Option[]
  const total = Number(market.total_pool)
  const rake = market.rake_pct ?? 0.08
  const isOpen = market.status === 'open'
  const isSettled = market.status === 'settled'
  const cat = CAT[detectCategory(market.title, market.description ?? '')]
  const { display: countdown, urgency } = useCountdown(isOpen ? market.closes_at : null)

  const meta        = market.metadata ?? {}
  const isUpDown    = meta.type === 'updown'
  const assetId     = isUpDown ? String(meta.asset ?? 'bitcoin') : null
  const entryPrice  = isUpDown ? Number(meta.entry_price ?? 0) : 0

  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [flagging, setFlagging] = useState(false)
  const [flagged, setFlagged] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [flagMsg, setFlagMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function submitFlag() {
    if (!flagReason) return
    const res = await fetch(`/api/market/${market.id}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: flagReason }),
    })
    if (res.ok) {
      setFlagged(true); setFlagging(false)
      setFlagMsg({ text: 'Flagged for admin review.', ok: true })
    } else {
      const d = await res.json()
      setFlagMsg({ text: d.error ?? 'Failed to submit flag.', ok: false })
    }
  }

  useEffect(() => {
    if (!isUpDown || !assetId) return
    async function fetchPrice() {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`)
        const d = await r.json()
        setLivePrice(d[assetId!]?.usd ?? null)
      } catch { /* silent */ }
    }
    fetchPrice()
    const id = setInterval(fetchPrice, 15_000)
    return () => clearInterval(id)
  }, [isUpDown, assetId])

  // Auto-settle expired Up/Down markets on page load
  useEffect(() => {
    if (!isUpDown || !isOpen) return
    const closesAt = market.closes_at ? new Date(market.closes_at) : null
    if (!closesAt || closesAt > new Date()) return
    fetch('/api/market/auto-settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id }),
    }).then(r => r.ok && r.json()).then(d => {
      if (d?.settled) router.refresh()
    }).catch(() => {})
  }, [isUpDown, isOpen, market.id, market.closes_at, router])

  const selectedOpt_init = initialPick ?? null
  const [selectedOpt, setSelectedOpt] = useState<string | null>(selectedOpt_init)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [confirmedAmt, setConfirmedAmt] = useState(0)
  const [confirmedOpt, setConfirmedOpt] = useState<Option | null>(null)
  const [balance, setBalance] = useState(initialBalance)
  const [liveOpts, setLiveOpts] = useState(opts)
  const [liveTotal, setLiveTotal] = useState(total)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    const channel = supabase
      .channel(`market-live:${market.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
        payload => {
          const updated = payload.new as { options?: Option[]; total_pool?: number }
          if (updated.options) setLiveOpts(updated.options)
          if (updated.total_pool !== undefined) setLiveTotal(Number(updated.total_pool))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market_options', filter: `market_id=eq.${market.id}` },
        payload => {
          const updated = payload.new as { id: string; total_pool: number }
          setLiveOpts(prev => prev.map(opt =>
            opt.id === updated.id ? { ...opt, total_pool: Number(updated.total_pool) } : opt
          ))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [market.id, isOpen])

  const fetchPreview = useCallback(async (optId: string, amt: number) => {
    if (!optId || amt < 1000) { setPreview(null); return }
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/market/${market.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: optId, amount: amt }),
      })
      if (res.ok) setPreview(await res.json())
      else setPreview(null)
    } catch { setPreview(null) }
    setPreviewLoading(false)
  }, [market.id])

  useEffect(() => {
    const amt = parseFloat(amount) || 0
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    if (!selectedOpt || amt < 1000) { setPreview(null); return }
    previewTimerRef.current = setTimeout(() => fetchPreview(selectedOpt, amt), 300)
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [amount, selectedOpt, fetchPreview])

  function oddsFor(opt: Option, pool = liveTotal) {
    if (pool <= 0 || opt.total_pool <= 0) return '—'
    return ((pool * (1 - rake)) / Number(opt.total_pool)).toFixed(2) + 'x'
  }
  function pctFor(opt: Option, pool = liveTotal) {
    return pool > 0 ? (Number(opt.total_pool) / pool) * 100 : 100 / liveOpts.length
  }

  const chosenOpt = liveOpts.find(o => o.id === selectedOpt)
  const amtNum = parseFloat(amount) || 0
  const estPayout = chosenOpt && amtNum > 0
    ? (() => {
        const newPool = liveTotal + amtNum
        const newOptPool = Number(chosenOpt.total_pool) + amtNum
        return ((newPool * (1 - rake)) / newOptPool) * amtNum
      })()
    : null

  const countdownColor =
    urgency === 'urgent' ? '#f87171' :
    urgency === 'soon'   ? '#fbbf24' : '#64748b'

  const winnerOpt = isSettled ? liveOpts.find(o => o.id === market.winning_option_id) : null
  const userWon = userBet && isSettled && userBet.option_id === market.winning_option_id
  const userLost = userBet && isSettled && userBet.option_id !== market.winning_option_id
  const userBetOpt = userBet ? liveOpts.find(o => o.id === userBet.option_id) : null

const marketUrl  = accessToken
    ? `https://sabula256.com/markets/${market.id}?t=${accessToken}`
    : `https://sabula256.com/markets/${market.id}`
  const shareText = encodeURIComponent(`"${market.title}" — Predict on Sabula 256 🔮 ${marketUrl}`)
  const waLink    = `https://wa.me/?text=${shareText}`
  const twLink    = `https://twitter.com/intent/tweet?text=${shareText}`

  async function placeBet() {
    if (!isLoggedIn) { router.push('/auth'); return }
    if (!selectedOpt) { setError('Choose an outcome first'); return }
    if (amtNum < 1000) { setError('Minimum bet is UGX 1,000'); return }
    if (balance !== null && amtNum > balance) { setError('Insufficient balance — deposit more in your wallet'); return }

    setLoading(true); setError('')
    const res = await fetch('/api/bet/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, optionId: selectedOpt, amount: amtNum, accessToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(friendlyBetError(data))
    } else {
      setBalance(data.newBalance)
      setLiveOpts(prev => prev.map(o =>
        o.id === selectedOpt ? { ...o, total_pool: Number(o.total_pool) + amtNum } : o
      ))
      setLiveTotal(prev => prev + amtNum)
      setConfirmedAmt(amtNum)
      setConfirmedOpt(chosenOpt ?? null)
      setDone(true)
      setAmount('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] page-enter">
      {/* Hero strip */}
      <div
        className="border-b px-4 py-10"
        style={{ borderColor: cat.border, background: `linear-gradient(180deg, ${cat.glow} 0%, transparent 100%)` }}
      >
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb */}
          <Link
            href="/markets"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← All markets
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Category + status badges */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                  style={cat.tag}
                >
                  {cat.icon} {cat.label}
                </span>
                {isOpen && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
                {isOpen && countdown && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold tabular-nums"
                    style={{ color: countdownColor, background: `${countdownColor}1a` }}
                  >
                    {urgency !== 'normal' && <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse mr-1.5" style={{ background: countdownColor }} />}
                    {countdown}
                  </span>
                )}
                {!isOpen && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {market.status}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black leading-tight text-white">
                {market.title}
              </h1>
              {market.description && (
                <p className="mt-2 text-slate-400 max-w-2xl">{market.description}</p>
              )}
              {typeof meta.resolution_criteria === 'string' && meta.resolution_criteria.trim() && (
                <div className="mt-3 max-w-2xl rounded-xl border border-sky-800/30 bg-sky-900/10 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-sky-400">⚖️ How this resolves</p>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed">{meta.resolution_criteria}</p>
                </div>
              )}
            </div>

            {/* Pool stat + share */}
            <div className="flex items-start gap-3 shrink-0">
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] px-6 py-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Pool</p>
                <p className="text-2xl font-black" style={{ color: cat.color }}>
                  UGX {Number(liveTotal).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">community pool</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-2xl border border-[#1e1e2e] bg-[#13131a] px-4 py-3 text-xs font-bold text-white hover:bg-[#25D366]/20 hover:border-[#25D366]/40 transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.115 1.527 5.843L0 24l6.335-1.51A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 01-5.012-1.378l-.36-.214-3.727.888.937-3.618-.235-.372A9.794 9.794 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
                  </svg>
                  WhatsApp
                </a>
                <a
                  href={twLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-2xl border border-[#1e1e2e] bg-[#13131a] px-4 py-3 text-xs font-bold text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
                >
                  𝕏 Tweet
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live crypto price ticker for Up/Down markets */}
      {isUpDown && (
        <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live price
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Entry */}
              <div className="text-xs">
                <span className="text-slate-600">Entry price </span>
                <span className="font-black text-slate-300">${entryPrice.toLocaleString()}</span>
              </div>
              {/* Current */}
              <div className="text-xs">
                <span className="text-slate-600">Now </span>
                {livePrice !== null ? (
                  <span className="font-black tabular-nums" style={{ color: livePrice >= entryPrice ? '#4ade80' : '#f87171' }}>
                    ${livePrice.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-slate-600 animate-pulse">fetching…</span>
                )}
              </div>
              {/* Change */}
              {livePrice !== null && entryPrice > 0 && (
                <div className="text-xs">
                  {(() => {
                    const pct = ((livePrice - entryPrice) / entryPrice) * 100
                    const color = pct >= 0 ? '#4ade80' : '#f87171'
                    const bg    = pct >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'
                    return (
                      <span className="rounded-full px-2.5 py-1 font-black tabular-nums" style={{ color, background: bg }}>
                        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(3)}%
                      </span>
                    )
                  })()}
                </div>
              )}
              {/* Direction signal */}
              {livePrice !== null && entryPrice > 0 && (
                <div className="text-xs font-bold" style={{ color: livePrice >= entryPrice ? '#4ade80' : '#f87171' }}>
                  {livePrice >= entryPrice ? '▲ Currently UP' : '▼ Currently DOWN'}
                  <span className="text-slate-600 font-normal"> · updates every 15s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User's existing bet banner */}
      {userBet && (
        <div className={`border-b px-4 py-3 ${
          userWon ? 'bg-emerald-900/20 border-emerald-800/40' :
          userLost ? 'bg-red-900/20 border-red-800/40' :
          'bg-sky-900/20 border-sky-800/40'
        }`}>
          <div className="mx-auto max-w-6xl text-sm">
            {userWon && <span className="text-emerald-400 font-semibold">You predicted correctly on &ldquo;{userBetOpt?.label}&rdquo; — you won!</span>}
            {userLost && <span className="text-red-400 font-semibold">You predicted &ldquo;{userBetOpt?.label}&rdquo; — that wasn&apos;t the winner.</span>}
            {!isSettled && (
              <span className="text-sky-300">
                You have an active bet of <span className="font-bold">UGX {Number(userBet.amount).toLocaleString()}</span> on
                &ldquo;{userBetOpt?.label ?? userBet.option_id}&rdquo;
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-10 pb-20 sm:pb-10">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Binary head-to-head */}
          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-600">Choose your side</h2>

            {/* Entity matchup header */}
            {liveOpts.length >= 2 && (() => {
              let logoA = getEntityLogo(liveOpts[0].label)
              let logoB = getEntityLogo(liveOpts[1].label)
              if (!logoA && !logoB) {
                const fromTitle = getEntityLogoFromTitle(market.title)
                logoA = fromTitle.logoA
                logoB = fromTitle.logoB
              }
              if (!logoA && !logoB) return null
              return (
                <div className="flex items-center justify-center gap-4 mb-5 py-3 rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
                  <div className="flex flex-col items-center gap-1.5">
                    <EntityLogo name={liveOpts[0].label} src={logoA} size={56} shape="circle" />
                    <span className="text-xs font-bold text-slate-400 max-w-[80px] text-center truncate">{liveOpts[0].label}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-600">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <EntityLogo name={liveOpts[1].label} src={logoB} size={56} shape="circle" />
                    <span className="text-xs font-bold text-slate-400 max-w-[80px] text-center truncate">{liveOpts[1].label}</span>
                  </div>
                </div>
              )
            })()}

            {/* Settled winner banner */}
            {isSettled && winnerOpt && (
              <div
                className="mb-5 flex items-center gap-3 rounded-xl px-5 py-4"
                style={{ background: cat.glow, border: `1px solid ${cat.border}` }}
              >
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Winning side</p>
                  <p className="font-black text-lg" style={{ color: cat.color }}>{winnerOpt.label}</p>
                </div>
              </div>
            )}

            {/* Side-by-side cards */}
            <div className="grid grid-cols-2 gap-4">
              {liveOpts.slice(0, 2).map((opt, idx) => {
                const isA       = idx === 0
                const color     = isA ? '#a78bfa' : '#fbbf24'
                const bg        = isA ? 'rgba(167,139,250,0.08)' : 'rgba(251,191,36,0.06)'
                const bdr       = isA ? 'rgba(167,139,250,0.25)' : 'rgba(251,191,36,0.2)'
                const bgSel     = isA ? 'rgba(167,139,250,0.2)'  : 'rgba(251,191,36,0.15)'
                const bdrSel    = isA ? 'rgba(167,139,250,0.7)'  : 'rgba(251,191,36,0.6)'
                const isSelected  = selectedOpt === opt.id
                const isWinner    = isSettled && opt.id === market.winning_option_id
                const isLoser     = isSettled && opt.id !== market.winning_option_id
                const isUserPick  = userBet?.option_id === opt.id
                const visual      = resolveVisual(opt.label, meta, color)
                const entityLogo  = getEntityLogo(opt.label)

                return (
                  <button
                    key={opt.id}
                    onClick={() => isOpen && !done && setSelectedOpt(opt.id)}
                    disabled={!isOpen || done}
                    className="relative flex flex-col items-center rounded-2xl p-6 text-center transition-all duration-150"
                    style={{
                      background:  isSelected ? bgSel : bg,
                      border:      `2px solid ${isSelected ? bdrSel : bdr}`,
                      opacity:     isLoser ? 0.4 : 1,
                      cursor:      isOpen && !done ? 'pointer' : 'default',
                      boxShadow:   isSelected ? `0 0 30px ${bgSel}` : 'none',
                      transform:   isSelected && isOpen ? 'translateY(-3px)' : 'none',
                    }}
                  >
                    <span
                      className="mb-3 text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color }}
                    >
                      {isA ? 'Side A' : 'Side B'}
                    </span>

                    {entityLogo ? (
                      <EntityLogo name={opt.label} src={entityLogo} size={64} shape="circle" className="mb-3" />
                    ) : (
                      <SideVisual v={visual} />
                    )}

                    <span
                      className="text-2xl font-black leading-tight"
                      style={{ color: isLoser ? '#475569' : '#f1f5f9' }}
                    >
                      {opt.label}
                    </span>

                    <span
                      className="mt-3 text-3xl font-black"
                      style={{ color: isLoser ? '#334155' : color }}
                    >
                      {oddsFor(opt)}
                    </span>

                    <span
                      className="mt-1 text-xs font-semibold"
                      style={{ color: isLoser ? '#334155' : `${color}80` }}
                    >
                      {pctFor(opt).toFixed(1)}% of pool
                    </span>

                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {isWinner && (
                        <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          🏆 Winner
                        </span>
                      )}
                      {isUserPick && (
                        <span className="rounded-full bg-violet-900/40 px-2.5 py-0.5 text-[10px] font-bold text-violet-400">
                          Your pick
                        </span>
                      )}
                      {isSelected && isOpen && !done && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                          style={{ background: `${color}20`, color }}
                        >
                          Selected ✓
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Tug-of-war bar */}
            {liveOpts.length >= 2 && (
              <div className="mt-5 rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4">
                <div className="mb-2 flex justify-between text-xs font-bold">
                  <span style={{ color: '#a78bfa' }}>{liveOpts[0].label}</span>
                  <span className="text-slate-600">Pool split</span>
                  <span style={{ color: '#fbbf24' }}>{liveOpts[1].label}</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[#1a1a2e]">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${pctFor(liveOpts[0])}%`,
                      background: 'linear-gradient(90deg,#6d28d9,#a78bfa)',
                    }}
                  />
                  <div
                    className="h-full flex-1"
                    style={{ background: 'linear-gradient(90deg,#b45309,#fbbf24)' }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-600">
                  <span>{pctFor(liveOpts[0]).toFixed(1)}%</span>
                  <span>UGX {Number(liveTotal).toLocaleString()} total pool</span>
                  <span>{pctFor(liveOpts[1]).toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Probability chart */}
            {liveOpts.length >= 2 && (
              <div className="mt-5">
                <OddsChart
                  marketId={market.id}
                  labelA={liveOpts[0].label}
                  labelB={liveOpts[1].label}
                  colorA="#a78bfa"
                  colorB="#fbbf24"
                />
              </div>
            )}

            {/* Recent bets feed */}
            <div className="mt-5">
              <RecentBets marketId={market.id} optionLabels={liveOpts.map(o => o.label)} />
            </div>

            {/* Discussion */}
            <div className="mt-5">
              <MarketComments marketId={market.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Bet slip — sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            {isOpen && !done && (
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
                <div className="border-b border-[#1e1e2e] px-5 py-4">
                  <h2 className="font-bold text-white">Place your prediction</h2>
                  {balance !== null && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Balance: <span className="text-slate-300 font-semibold">UGX {Number(balance).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Selected outcome display */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Your pick</label>
                    {chosenOpt ? (
                      <div
                        className="rounded-xl px-4 py-3 flex items-center justify-between"
                        style={{ background: cat.glow, border: `1px solid ${cat.border}` }}
                      >
                        <span className="font-semibold text-slate-100">{chosenOpt.label}</span>
                        <span className="font-black text-sm" style={{ color: cat.color }}>{oddsFor(chosenOpt)}</span>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#2a2a3e] px-4 py-3 text-sm text-slate-500 text-center">
                        Select an outcome ↑
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount (UGX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      min="1000"
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-violet-600 transition-colors"
                    />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[1000, 5000, 10000, 50000].map(v => {
                        const isGoodFaith = Boolean(meta.user_created) && v === 5000
                        return (
                          <button
                            key={v}
                            onClick={() => setAmount(String(v))}
                            className={`rounded-lg border py-1.5 text-xs transition-colors ${
                              isGoodFaith
                                ? 'border-violet-700/60 bg-violet-900/20 text-violet-400 font-bold hover:border-violet-500 hover:text-violet-300'
                                : 'border-[#1e1e2e] text-slate-500 hover:border-violet-700/60 hover:text-white'
                            }`}
                          >
                            {v >= 1000 ? `${v / 1000}k` : v}
                            {isGoodFaith && <span className="ml-0.5 text-[8px]">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payout preview */}
                  {amtNum >= 1000 && selectedOpt && (
                    <div className="rounded-xl bg-[#0a0a0f] px-4 py-3 space-y-1.5 text-sm">
                      {previewLoading ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-transparent" />
                          <span className="text-xs">Calculating…</span>
                        </div>
                      ) : preview ? (
                        <>
                          <div className="flex justify-between text-slate-500">
                            <span>Stake</span>
                            <span>UGX {amtNum.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-[#1e1e2e] pt-1.5 mt-1">
                            <span className="text-slate-300">Est. return</span>
                            <span style={{ color: cat.color }}>UGX {Number(preview.estimated_payout).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Profit if correct</span>
                            <span className="text-emerald-400 font-semibold">
                              +UGX {Number(preview.estimated_profit).toLocaleString()} ({preview.estimated_roi_pct}%)
                            </span>
                          </div>
                          {preview.probability_shift_pct > 0.5 && (
                            <p className="text-[10px] text-slate-600">
                              Moves market: {Math.round(preview.probability_current * 100)}% →{' '}
                              {Math.round(preview.probability_if_placed * 100)}%
                            </p>
                          )}
                          {/* Pool depth warning */}
                          {(() => {
                            const depth = getPoolDepth(liveTotal)
                            const badge = DEPTH_BADGE[depth.rating]
                            return depth.warning ? (
                              <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]"
                                style={{ background: `${badge.color}14`, border: `1px solid ${badge.border}`, color: badge.color }}>
                                ⚠ {depth.warning}
                              </div>
                            ) : null
                          })()}
                          {preview.warning === 'large_bet_moves_market' && (
                            <div className="rounded-lg border border-amber-800/40 bg-amber-900/20 px-3 py-2 text-[11px] text-amber-400">
                              ⚠ This bet moves the market significantly ({preview.probability_shift_pct.toFixed(1)}%)
                            </div>
                          )}
                        </>
                      ) : estPayout !== null ? (
                        <>
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-300">Est. payout</span>
                            <span style={{ color: cat.color }}>UGX {estPayout.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                          </div>
                          <p className="text-[10px] text-slate-600">Payout updates as others bet</p>
                        </>
                      ) : null}
                    </div>
                  )}

                  {error && <p className="rounded-lg bg-red-900/20 px-4 py-2.5 text-sm text-red-400">{error}</p>}


                  {isLoggedIn ? (
                    <button
                      onClick={placeBet}
                      disabled={loading || !selectedOpt || amtNum < 1000}
                      className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
                      style={{
                        background: selectedOpt && amtNum >= 1000 ? cat.color : '#1e1e2e',
                        color: selectedOpt && amtNum >= 1000 ? '#0a0a0f' : '#64748b',
                      }}
                    >
                      {loading ? 'Placing…' : 'Confirm Prediction'}
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="block w-full rounded-xl bg-violet-600 py-3.5 text-center text-sm font-bold text-white hover:bg-violet-500 transition-colors"
                    >
                      Log in to predict
                    </Link>
                  )}

                  {Boolean(meta.user_created) ? (
                    <p className="text-center text-[11px] text-slate-500 leading-relaxed">
                      The creator staked UGX 5,000 to open this market.
                      Back your side with UGX 5,000+ as your show of confidence.
                    </p>
                  ) : (
                    <p className="text-center text-[11px] text-slate-600">Community prediction pool</p>
                  )}
                </div>
              </div>
            )}

            {/* Success state */}
            {done && (
              <div
                className="rounded-2xl p-8 text-center space-y-4"
                style={{ background: cat.glow, border: `1px solid ${cat.border}` }}
              >
                <div className="text-5xl">🎯</div>
                <div>
                  <p className="text-lg font-black text-white">Prediction placed!</p>
                  <p className="text-sm text-slate-400 mt-1">
                    UGX {confirmedAmt.toLocaleString()} on &ldquo;{confirmedOpt?.label}&rdquo;
                  </p>
                </div>
                {balance !== null && (
                  <p className="text-sm text-slate-500">
                    New balance: <span className="font-semibold text-slate-300">UGX {Number(balance).toLocaleString()}</span>
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Link
                    href="/bets"
                    className="flex-1 rounded-xl border border-[#2a2a3e] py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors text-center"
                  >
                    My Bets
                  </Link>
                  <Link
                    href="/markets"
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-center transition-colors"
                    style={{ background: cat.color, color: '#0a0a0f' }}
                  >
                    More Markets
                  </Link>
                </div>
              </div>
            )}

            {/* Closed / settled info */}
            {!isOpen && !done && (
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-6 text-center space-y-3">
                <div className="text-4xl">{isSettled ? '🏆' : '🔒'}</div>
                <p className="font-bold text-slate-300">
                  {isSettled ? 'Market settled' : 'Market closed'}
                </p>
                <p className="text-sm text-slate-500">
                  {isSettled
                    ? 'Winnings have been distributed to correct predictors.'
                    : 'This market is no longer accepting predictions.'}
                </p>
                {isSettled && market.settlement_note && (
                  <div className="rounded-xl border border-violet-800/30 bg-violet-900/10 px-4 py-3 text-left">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-500">Admin note</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{market.settlement_note}</p>
                  </div>
                )}
                {isSettled && market.settlement_evidence_url && (() => {
                  let items: { url: string; caption: string }[] = []
                  if (market.settlement_evidence_url.startsWith('[')) {
                    try { items = JSON.parse(market.settlement_evidence_url) } catch { /* ignore */ }
                  }
                  if (items.length > 0) {
                    return (
                      <div className="text-left">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Settlement Evidence</p>
                        <div className={`grid gap-2 ${items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {items.map((item, i) => (
                            <a
                              key={i}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block overflow-hidden rounded-lg border border-[#1e1e2e] hover:border-violet-600/50 transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt={item.caption || `Evidence ${i + 1}`}
                                className="w-full object-cover aspect-video bg-[#0d0d14]"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white transition-opacity">View full ↗</span>
                              </div>
                              {item.caption && (
                                <div className="bg-[#0d0d14] px-2 py-1.5">
                                  <p className="text-[10px] text-slate-400 leading-snug">{item.caption}</p>
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  // Legacy plain URL
                  return (
                    <a
                      href={market.settlement_evidence_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/40 py-2 text-xs font-semibold text-slate-400 hover:border-violet-600/50 hover:text-violet-400 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      View source →
                    </a>
                  )
                })()}
                <Link
                  href="/markets"
                  className="block rounded-xl border border-[#2a2a3e] py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Browse open markets →
                </Link>
                {isSettled && isLoggedIn && !flagged && (
                  <div>
                    {flagMsg && (
                      <p className={`mb-2 text-xs ${flagMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{flagMsg.text}</p>
                    )}
                    {!flagging ? (
                      <button
                        onClick={() => setFlagging(true)}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        🚩 Dispute this settlement
                      </button>
                    ) : (
                      <div className="text-left space-y-2">
                        <p className="text-xs font-semibold text-slate-400">Why are you disputing?</p>
                        {['Wrong winner declared', 'Outcome not yet determined', 'Evidence seems incorrect', 'Other'].map(r => (
                          <button
                            key={r}
                            onClick={() => setFlagReason(r)}
                            className={`block w-full rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                              flagReason === r ? 'border-red-600 bg-red-900/20 text-red-300' : 'border-[#2a2a3e] text-slate-500 hover:border-slate-600'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={submitFlag}
                            disabled={!flagReason}
                            className="flex-1 rounded-lg bg-red-700 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-red-600 transition-colors"
                          >
                            Submit dispute
                          </button>
                          <button
                            onClick={() => { setFlagging(false); setFlagReason('') }}
                            className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs text-slate-500 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {flagged && (
                  <p className="text-xs text-emerald-400">✓ Dispute submitted — admin will review.</p>
                )}
              </div>
            )}

            {/* Live prices */}
            <PriceWidget />

            {/* Market metadata */}
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-xs text-slate-500 space-y-2">
              {market.closes_at && (
                <div className="flex justify-between">
                  <span>Closes</span>
                  <span className="text-slate-300">
                    {new Date(market.closes_at).toLocaleString('en-UG', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      timeZone: 'Africa/Kampala'
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Participants</span>
                <span className="text-slate-300">{liveOpts.reduce((s, o) => s + (Number(o.total_pool) > 0 ? 1 : 0), 0)} active options</span>
              </div>
              {creatorInfo && (
                <div className="flex justify-between items-center">
                  <span>Created by</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    {creatorInfo.name}
                    {creatorInfo.verified && (
                      <span title="Verified Creator" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[8px] font-black text-white">✓</span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Market ID</span>
                <span className="text-slate-600 font-mono">{market.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
