'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PriceWidget from '@/components/PriceWidget'
import { createClient } from '@/lib/supabase/client'
import MarketChart from '@/components/MarketChart'
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
  'pax-gold':   'https://assets.coingecko.com/coins/images/9519/large/paxg.PNG',
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

  if (meta.type === 'updown' || meta.type === 'price_level') {
    const asset = String(meta.asset ?? 'bitcoin')
    const url   = CRYPTO_ICONS[asset]
    if (url) {
      const dir = meta.type === 'updown'
        ? (l.includes('up') ? 'up' : l.includes('down') ? 'down' : null)
        : null
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
  creatorInfo?: { name: string; username: string | null; verified: boolean } | null
}) {
  const router = useRouter()
  const [liveStatus, setLiveStatus] = useState(market.status)
  const opts = market.options as Option[]
  const total = Number(market.total_pool)
  const rake = market.rake_pct ?? 0.08
  const isOpen = liveStatus === 'open'
  const isSettled = liveStatus === 'settled'
  const cat = CAT[detectCategory(market.title, market.description ?? '')]
  const { display: countdown, urgency } = useCountdown(isOpen ? market.closes_at : null)

  const meta        = market.metadata ?? {}
  // Settlement note is stored in metadata (jsonb), not a top-level column.
  const settlementNote = typeof meta.settlement_note === 'string' ? meta.settlement_note : null
  const isUpDown      = meta.type === 'updown'
  const isPriceLevel  = meta.type === 'price_level'
  const isAssetMarket = isUpDown || isPriceLevel
  const assetId       = isAssetMarket ? String(meta.asset ?? 'bitcoin') : null
  const entryPrice    = isUpDown ? Number(meta.entry_price ?? 0) : 0
  const priceLevelTarget = isPriceLevel ? Number(meta.target_price ?? 0) : 0
  const priceLevelDir    = isPriceLevel ? String(meta.direction ?? 'above') : 'above'

  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [chartPrices, setChartPrices] = useState<[number, number][]>([])
  const [flagging, setFlagging] = useState(false)
  const [flagged, setFlagged] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [flagMsg, setFlagMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [settleRequested, setSettleRequested] = useState(false)
  const [settleReqLoading, setSettleReqLoading] = useState(false)
  const [settleReqMsg, setSettleReqMsg] = useState<string | null>(null)

  async function requestSettlement() {
    setSettleReqLoading(true)
    const res = await fetch('/api/market/request-settlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id }),
    })
    if (res.ok) {
      setSettleRequested(true)
      setSettleReqMsg('Admin notified — settlement is on its way.')
    } else {
      const d = await res.json()
      setSettleReqMsg(d.error ?? 'Could not send request.')
    }
    setSettleReqLoading(false)
  }

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
    if (!isAssetMarket || !assetId) return
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
  }, [isAssetMarket, assetId])

  useEffect(() => {
    if (!isAssetMarket || !assetId) return
    fetch(`/api/prices/chart?id=${assetId}&days=7`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.prices?.length) setChartPrices(d.prices) })
      .catch(() => {})
  }, [isAssetMarket, assetId])

  // Auto-settle expired asset markets on page load
  useEffect(() => {
    if (!isAssetMarket || !isOpen) return
    const closesAt = market.closes_at ? new Date(market.closes_at) : null
    if (!closesAt || closesAt > new Date()) return
    fetch('/api/market/auto-settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id }),
    }).then(r => r.ok && r.json()).then(d => {
      if (d?.settled) router.refresh()
    }).catch(() => {})
  }, [isAssetMarket, isOpen, market.id, market.closes_at, router])

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
    const supabase = createClient()
    const channel = supabase
      .channel(`market-live:${market.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
        payload => {
          const updated = payload.new as { options?: Option[]; total_pool?: number; status?: string }
          if (updated.options) setLiveOpts(updated.options)
          if (updated.total_pool !== undefined) setLiveTotal(Number(updated.total_pool))
          if (updated.status && updated.status !== liveStatus) {
            setLiveStatus(updated.status)
            // Refresh page on settle so winning banner + payouts display immediately
            if (updated.status === 'settled' || updated.status === 'closed') {
              router.refresh()
            }
          }
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
  }, [market.id, liveStatus, router])

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
    const optPool = opt.total_pool ?? 0
    if (pool <= 0 || optPool <= 0) return '—'
    return ((pool * (1 - rake)) / optPool).toFixed(2) + 'x'
  }
  function pctFor(opt: Option, pool = liveTotal) {
    return pool > 0 ? ((opt.total_pool ?? 0) / pool) * 100 : 100 / liveOpts.length
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
    <div className="min-h-screen bg-[#0a0c0e] page-enter" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Clean flat header — no gradient */}
      <div className="border-b border-[#1e2327] px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/markets"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#5e6872] hover:text-[#eceef0] transition-colors"
          >
            ← All markets
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              {/* Minimal text badges — no colored pill backgrounds */}
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#5e6872]">
                  {cat.label}
                </span>
                {isOpen && (
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#22c55e]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
                    Live
                  </span>
                )}
                {isOpen && countdown && (
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: countdownColor }}>
                    {countdown}
                  </span>
                )}
                {!isOpen && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5e6872]">
                    {market.status}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black leading-tight text-[#eceef0]">
                {market.title}
              </h1>
              {market.description && (
                <p className="mt-2 text-sm text-[#5e6872] max-w-2xl leading-relaxed">{market.description}</p>
              )}
              {typeof meta.resolution_criteria === 'string' && meta.resolution_criteria.trim() && (
                <div className="mt-3 max-w-2xl rounded-xl border border-[#1e2327] bg-[#111316] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5e6872]">How this resolves</p>
                  <p className="mt-1 text-sm text-[#9ca3af] leading-relaxed">{meta.resolution_criteria}</p>
                </div>
              )}
            </div>

            {/* Pool stat + share */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 w-full sm:w-auto sm:shrink-0">
              <div className="flex items-center justify-between sm:block rounded-2xl border border-[#1e2327] bg-[#111316] px-4 sm:px-6 py-3 sm:py-4 sm:text-center">
                <p className="text-[10px] font-bold text-[#5e6872] uppercase tracking-wider">Total Pool</p>
                <p className="text-xl sm:text-2xl font-black text-[#22c55e]">
                  UGX {Number(liveTotal).toLocaleString()}
                </p>
                <p className="hidden sm:block text-[10px] text-[#5e6872] mt-0.5">community pool</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-2xl border border-[#1e2327] bg-[#111316] px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold text-[#eceef0] hover:border-[#22c55e]/40 transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.115 1.527 5.843L0 24l6.335-1.51A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 01-5.012-1.378l-.36-.214-3.727.888.937-3.618-.235-.372A9.794 9.794 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </a>
                <a
                  href={twLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-2xl border border-[#1e2327] bg-[#111316] px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold text-[#5e6872] hover:border-[#3a4049] hover:text-[#eceef0] transition-colors"
                >
                  𝕏
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 pb-20 sm:pb-10">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">

          {/* Binary head-to-head */}
          <div className="lg:col-span-2 order-1 lg:order-1">
            {/* Step 1 indicator — mobile only */}
            <div className="mb-4 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e] text-[11px] font-black text-[#0a0c0e]">1</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#cfd6d2]">Choose your side</span>
            </div>
            <h2 className="mb-5 hidden lg:block text-xs font-bold uppercase tracking-widest text-[#5e6872]">Choose your side</h2>

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
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/06 px-5 py-4">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-xs text-[#5e6872] uppercase tracking-wider">Winning side</p>
                  <p className="font-black text-lg text-[#22c55e]">{winnerOpt.label}</p>
                </div>
              </div>
            )}

            {/* Side-by-side cards — YES green / NO red */}
            <div className="grid grid-cols-2 gap-4">
              {liveOpts.slice(0, 2).map((opt, idx) => {
                const isYes    = opt.label.toLowerCase() === 'yes' || idx === 0
                const color    = isYes ? '#22c55e' : '#ef4444'
                const bg       = isYes ? 'rgba(34,197,94,0.07)'  : 'rgba(239,68,68,0.07)'
                const bdr      = isYes ? 'rgba(34,197,94,0.18)'  : 'rgba(239,68,68,0.18)'
                const bgSel    = isYes ? 'rgba(34,197,94,0.17)'  : 'rgba(239,68,68,0.16)'
                const bdrSel   = isYes ? 'rgba(34,197,94,0.55)'  : 'rgba(239,68,68,0.5)'
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
                    className="relative flex flex-col items-center rounded-2xl p-3 sm:p-5 text-center transition-all duration-150"
                    style={{
                      background:  isSelected ? bgSel : bg,
                      border:      `2px solid ${isSelected ? bdrSel : bdr}`,
                      opacity:     isLoser ? 0.35 : 1,
                      cursor:      isOpen && !done ? 'pointer' : 'default',
                      boxShadow:   isSelected ? `0 0 24px ${isYes ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)'}` : 'none',
                      transform:   isSelected && isOpen ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    {entityLogo ? (
                      <EntityLogo name={opt.label} src={entityLogo} size={48} shape="circle" className="mb-2 sm:mb-3 sm:!w-14 sm:!h-14" />
                    ) : (
                      <SideVisual v={visual} />
                    )}

                    <span
                      className="text-base sm:text-xl font-black leading-tight"
                      style={{ color: isLoser ? '#3a4049' : '#eceef0' }}
                    >
                      {opt.label}
                    </span>

                    <span
                      className="mt-2 text-2xl sm:text-3xl font-black"
                      style={{ color: isLoser ? '#2a3038' : color }}
                    >
                      {oddsFor(opt)}
                    </span>

                    <span className="mt-1 text-xs font-medium" style={{ color: isLoser ? '#2a3038' : '#5e6872' }}>
                      {pctFor(opt).toFixed(1)}% of pool
                    </span>

                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {isWinner && (
                        <span className="rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#22c55e]">
                          Winner
                        </span>
                      )}
                      {isUserPick && (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-[#eceef0]">
                          Your pick
                        </span>
                      )}
                      {isSelected && isOpen && !done && (
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: `${color}18`, color }}>
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
              <div className="mt-4 rounded-2xl border border-[#1c2622] bg-[#101614] p-4">
                <div className="mb-2.5 flex justify-between text-[13px] font-black">
                  <span className="text-[#22c55e]">{liveOpts[0].label}</span>
                  <span className="text-[11px] font-bold tracking-wide text-[#5e6872]">Pool split</span>
                  <span className="text-[#ef4444]">{liveOpts[1].label}</span>
                </div>
                <div className="flex h-[9px] overflow-hidden rounded-full bg-[#1c2622]">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${pctFor(liveOpts[0])}%`, background: 'linear-gradient(90deg,#14c56f,#22c55e)' }}
                  />
                  <div
                    className="h-full flex-1"
                    style={{ background: 'linear-gradient(90deg,#ef4444,#c53a52)' }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#6f7a75]">
                  <span>{pctFor(liveOpts[0]).toFixed(1)}%</span>
                  <span>UGX {Number(liveTotal).toLocaleString()} pool</span>
                  <span>{pctFor(liveOpts[1]).toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Probability chart */}
            <div className="mt-5">
              <MarketChart marketId={market.id} />
            </div>

            {/* Recent bets feed */}
            <div className="mt-5">
              <RecentBets marketId={market.id} optionLabels={liveOpts.map(o => o.label)} />
            </div>

            {/* Discussion */}
            <div className="mt-5">
              <MarketComments marketId={market.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Event Slip — sticky on desktop, below cards on mobile */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4 order-2 lg:order-2">

            {/* Live price ticker for asset markets */}
            {isAssetMarket && (() => {
              const ref      = isUpDown ? entryPrice : priceLevelTarget
              const invert   = isPriceLevel && priceLevelDir === 'below'
              const pct      = livePrice !== null && ref > 0 ? ((livePrice - ref) / ref) * 100 : null
              const clamped  = pct !== null ? Math.max(-10, Math.min(10, pct)) : 0
              const needleDeg = 90 - clamped * 9
              const nRad     = needleDeg * Math.PI / 180
              const cx = 100, cy = 92, r = 66
              const nx = cx + r * Math.cos(nRad)
              const ny = cy - r * Math.sin(nRad)
              const isGood   = invert ? (pct !== null && pct < 0) : (pct !== null && pct >= 0)
              const nColor   = livePrice === null ? '#374151' : isGood ? '#4ade80' : '#f87171'
              const lColor   = invert ? '#4ade80' : '#f87171'
              const rColor   = invert ? '#f87171' : '#4ade80'
              const lLabel   = isUpDown ? 'DOWN' : (invert ? 'YES' : 'NO')
              const rLabel   = isUpDown ? 'UP'   : (invert ? 'NO'  : 'YES')
              const ticks    = [180, 135, 90, 45, 0]
              return (
                <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Live Price</span>
                    <span className="ml-auto text-[10px] text-slate-700">15s</span>
                  </div>
                  <svg viewBox="0 0 200 108" className="w-full h-auto" style={{ maxHeight: 110 }}>
                    <path d="M 26 92 A 74 74 0 0 1 174 92" fill="none" stroke="#111120" strokeWidth="16" strokeLinecap="round" />
                    <path d="M 26 92 A 74 74 0 0 1 100 18" fill="none" stroke={lColor} strokeWidth="13" strokeLinecap="round" opacity="0.45" />
                    <path d="M 100 18 A 74 74 0 0 1 174 92" fill="none" stroke={rColor} strokeWidth="13" strokeLinecap="round" opacity="0.45" />
                    {ticks.map(deg => {
                      const tr = deg * Math.PI / 180
                      return (
                        <line key={deg}
                          x1={cx + 80 * Math.cos(tr)} y1={cy - 80 * Math.sin(tr)}
                          x2={cx + 69 * Math.cos(tr)} y2={cy - 69 * Math.sin(tr)}
                          stroke="#2a2a3e" strokeWidth="1.5" strokeLinecap="round"
                        />
                      )
                    })}
                    {livePrice !== null ? (
                      <>
                        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={nColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                        <circle cx={cx} cy={cy} r="5.5" fill={nColor} />
                        <circle cx={cx} cy={cy} r="2.5" fill="#0a0a0f" />
                      </>
                    ) : (
                      <circle cx={cx} cy={cy} r="5" fill="#2a2a3e" />
                    )}
                    <text x="13" y="107" textAnchor="middle" fontSize="8" fontWeight="800" fill={lColor} fontFamily="system-ui,sans-serif">{lLabel}</text>
                    <text x="187" y="107" textAnchor="middle" fontSize="8" fontWeight="800" fill={rColor} fontFamily="system-ui,sans-serif">{rLabel}</text>
                  </svg>
                  {livePrice !== null ? (
                    <div className="mt-2 text-center space-y-0.5">
                      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: nColor }}>
                        ${livePrice.toLocaleString()}
                      </p>
                      {pct !== null && (
                        <p className="text-xs font-black" style={{ color: nColor }}>
                          {pct >= 0 ? '+' : ''}{pct.toFixed(3)}%{' '}
                          <span className="text-slate-600 font-normal">vs {isUpDown ? 'entry' : 'target'}</span>
                        </p>
                      )}
                      <p className="text-[11px] font-bold" style={{ color: nColor }}>
                        {isUpDown
                          ? (livePrice >= entryPrice ? '▲ Currently UP' : '▼ Currently DOWN')
                          : (isGood ? '✓ YES winning' : '✗ NO winning')
                        }
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {isUpDown
                          ? `Entry $${entryPrice.toLocaleString()}`
                          : `Target $${priceLevelTarget.toLocaleString()} (${priceLevelDir})`
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 text-center animate-pulse mt-2">fetching…</p>
                  )}
                </div>
              )
            })()}

            {isOpen && !done && (
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
                <div className="border-b border-[#1e1e2e] px-5 py-4">
                  {/* Step 2 indicator — mobile only */}
                  <div className="mb-2 flex items-center gap-2 lg:hidden">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e] text-[11px] font-black text-[#0a0c0e]">2</span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#cfd6d2]">Event Slip</span>
                  </div>
                  <h2 className="font-bold text-white">Event Slip</h2>
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
                      <div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/08 px-4 py-3 flex items-center justify-between">
                        <span className="font-semibold text-[#eceef0]">{chosenOpt.label}</span>
                        <span className="font-black text-sm text-[#22c55e]">{oddsFor(chosenOpt)}</span>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#2a2a3e] px-4 py-3 flex items-center justify-between text-sm text-slate-500">
                        <span>No pick yet</span>
                        <span className="text-xs">Tap YES or NO above ↑</span>
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
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm outline-none focus:border-[#22c55e]/60 transition-colors text-[#eceef0] placeholder:text-[#3a4049]"
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
                                ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e] font-bold hover:border-[#22c55e]/70 hover:text-[#4ade80]'
                                : 'border-[#1e1e2e] text-[#5e6872] hover:border-[#22c55e]/30 hover:text-[#eceef0]'
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
                            <span className="text-[#22c55e]">UGX {Number(preview.estimated_payout).toLocaleString()}</span>
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
                            <span className="text-[#22c55e]">UGX {estPayout.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
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
                        background: selectedOpt && amtNum >= 1000 ? '#22c55e' : '#1e2327',
                        color: selectedOpt && amtNum >= 1000 ? '#0a0c0e' : '#5e6872',
                      }}
                    >
                      {loading ? 'Placing…' : !selectedOpt ? 'Select a side above' : !amtNum || amtNum < 1000 ? 'Enter an amount' : 'Confirm Prediction'}
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="block w-full rounded-xl bg-[#22c55e] py-3.5 text-center text-sm font-bold text-[#0a0c0e] hover:bg-[#16a34a] transition-colors"
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
              <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/06 p-8 text-center space-y-4">
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
                    className="flex-1 rounded-xl bg-[#22c55e] py-2.5 text-sm font-bold text-center text-[#0a0c0e] hover:bg-[#16a34a] transition-colors"
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
                {isSettled && settlementNote && (
                  <div className="rounded-xl border border-[#1e2327] bg-[#111316] px-4 py-3 text-left">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#5e6872]">Admin note</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{settlementNote}</p>
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
                              className="group relative block overflow-hidden rounded-lg border border-[#1e1e2e] hover:border-[#22c55e]/30 transition-colors"
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
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1e2327] py-2 text-xs font-semibold text-[#5e6872] hover:border-[#22c55e]/30 hover:text-[#22c55e] transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      View source →
                    </a>
                  )
                })()}
                {!isSettled && isLoggedIn && (
                  <div>
                    {settleReqMsg ? (
                      <p className={`text-xs font-medium ${settleRequested ? 'text-emerald-400' : 'text-red-400'}`}>{settleReqMsg}</p>
                    ) : (
                      <button
                        onClick={requestSettlement}
                        disabled={settleReqLoading}
                        className="w-full rounded-xl border border-amber-800/50 bg-amber-900/10 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-900/25 disabled:opacity-50 transition-colors"
                      >
                        {settleReqLoading ? 'Notifying admin…' : '🔔 Notify admin to settle'}
                      </button>
                    )}
                  </div>
                )}
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
                  <span className="text-slate-300 flex items-center gap-1.5">
                    {creatorInfo.username
                      ? <span className="font-bold text-violet-400">@{creatorInfo.username}</span>
                      : creatorInfo.name
                    }
                    {creatorInfo.verified && (
                      <span title="Verified Creator" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#22c55e] text-[8px] font-black text-[#0a0c0e]">✓</span>
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

      {/* 7-day price chart — full width below all content */}
      {isAssetMarket && chartPrices.length > 1 && (() => {
        const W = 600, H = 220
        const padL = 68, padR = 16, padT = 12, padB = 28
        const cW = W - padL - padR
        const cH = H - padT - padB

        const rawPrices = chartPrices.map(p => p[1])
        const rawTimes  = chartPrices.map(p => p[0])
        const minP = Math.min(...rawPrices)
        const maxP = Math.max(...rawPrices)
        const rangeP = maxP - minP || 1
        const minT = rawTimes[0]
        const maxT = rawTimes[rawTimes.length - 1]

        const ref = isUpDown ? entryPrice : priceLevelTarget
        const isGoodNow = livePrice !== null && (
          isUpDown ? livePrice >= entryPrice
                   : priceLevelDir === 'above' ? livePrice >= ref : livePrice <= ref
        )
        const lineColor = livePrice === null ? '#4ade80' : isGoodNow ? '#4ade80' : '#f87171'

        function px(t: number) { return padL + ((t - minT) / (maxT - minT || 1)) * cW }
        function py(p: number) { return padT + (1 - (p - minP) / rangeP) * cH }

        const polyPts = chartPrices.map(([t, p]) => `${px(t).toFixed(1)},${py(p).toFixed(1)}`).join(' ')
        const areaD = `M ${px(minT).toFixed(1)} ${(padT + cH).toFixed(1)} ` +
          chartPrices.map(([t, p]) => `L ${px(t).toFixed(1)},${py(p).toFixed(1)}`).join(' ') +
          ` L ${px(maxT).toFixed(1)} ${(padT + cH).toFixed(1)} Z`

        const ySteps = 5
        const yLabels = Array.from({ length: ySteps }, (_, i) => {
          const frac = i / (ySteps - 1)
          const price = minP + rangeP * frac
          const y = py(price)
          const label = price >= 1000
            ? `$${(price / 1000).toFixed(price >= 10000 ? 0 : 1)}k`
            : `$${price.toFixed(0)}`
          return { y, label }
        })

        const dayCount = 7
        const xLabels = Array.from({ length: dayCount }, (_, i) => {
          const t = minT + (maxT - minT) * (i / (dayCount - 1))
          const x = px(t)
          const label = new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return { x, label }
        })

        const refInRange = ref > 0 && ref >= minP * 0.99 && ref <= maxP * 1.01
        const refY = refInRange ? py(Math.max(minP, Math.min(maxP, ref))) : null
        const liveDotY = livePrice !== null ? py(Math.max(minP, Math.min(maxP, livePrice))) : null
        const gradId = `pchart-${market.id}`

        return (
          <div className="border-t border-[#1e1e2e] bg-[#0a0a0f] px-4 py-6 mt-2">
            <div className="mx-auto max-w-6xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                  7-Day Price Chart · USD
                </p>
                <p className="text-[10px] text-slate-700">CoinGecko</p>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 220 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={lineColor} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {yLabels.map(({ y, label }, i) => (
                  <g key={i}>
                    <line x1={padL} y1={y.toFixed(1)} x2={W - padR} y2={y.toFixed(1)} stroke="#1a1a2e" strokeWidth="1" />
                    <text x={padL - 5} y={(y + 3.5).toFixed(1)} textAnchor="end" fontSize="9.5" fill="#4b5563" fontFamily="ui-monospace,monospace">
                      {label}
                    </text>
                  </g>
                ))}
                {xLabels.map(({ x, label }, i) => (
                  <text key={i} x={x.toFixed(1)} y={H - 5} textAnchor="middle" fontSize="8.5" fill="#374151" fontFamily="system-ui,sans-serif">
                    {label}
                  </text>
                ))}
                {refY !== null && (
                  <g>
                    <line x1={padL} y1={refY.toFixed(1)} x2={W - padR} y2={refY.toFixed(1)} stroke="#64748b" strokeWidth="1.25" strokeDasharray="5,4" opacity="0.7" />
                    <rect x={padL + 4} y={(refY - 9).toFixed(1)} width="82" height="11" rx="3" fill="#0a0a0f" opacity="0.85" />
                    <text x={padL + 7} y={(refY + 0.5).toFixed(1)} fontSize="8.5" fill="#94a3b8" fontFamily="ui-monospace,monospace">
                      {isUpDown ? 'Entry' : 'Target'} ${ref.toLocaleString()}
                    </text>
                  </g>
                )}
                <path d={areaD} fill={`url(#${gradId})`} />
                <polyline points={polyPts} fill="none" stroke={lineColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                {liveDotY !== null && livePrice !== null && (
                  <g>
                    <circle cx={W - padR} cy={liveDotY.toFixed(1)} r="5" fill={lineColor} />
                    <circle cx={W - padR} cy={liveDotY.toFixed(1)} r="9" fill={lineColor} opacity="0.18" />
                    <rect x={W - padR - 72} y={(liveDotY - 10).toFixed(1)} width="64" height="12" rx="3" fill="#0a0a0f" opacity="0.9" />
                    <text x={W - padR - 40} y={(liveDotY + 0.5).toFixed(1)} textAnchor="middle" fontSize="9" fill={lineColor} fontFamily="ui-monospace,monospace" fontWeight="700">
                      ${livePrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
