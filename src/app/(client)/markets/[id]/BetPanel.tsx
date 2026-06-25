'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PriceWidget from '@/components/PriceWidget'
import { createClient } from '@/lib/supabase/client'
import OddsChart from '@/components/OddsChart'
import MarketComments from '@/components/MarketComments'

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
  metadata: Record<string, unknown> | null
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
}: {
  market: Market
  initialBalance: number | null
  initialPick: string | null
  isLoggedIn: boolean
  userBet: { option_id: string; amount: number } | null
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
  const [copied, setCopied] = useState(false)

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
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [market.id, isOpen])

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

  function shareMarket() {
    const url  = typeof window !== 'undefined' ? window.location.href : ''
    const text = `${market.title} — Predict on Sabula 256`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: text, url }).catch(() => null)
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => null)
    }
  }

  async function placeBet() {
    if (!isLoggedIn) { router.push('/auth'); return }
    if (!selectedOpt) { setError('Choose an outcome first'); return }
    if (amtNum < 1000) { setError('Minimum bet is UGX 1,000'); return }
    if (balance !== null && amtNum > balance) { setError('Insufficient balance — deposit more in your wallet'); return }

    setLoading(true); setError('')
    const res = await fetch('/api/bet/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, optionId: selectedOpt, amount: amtNum }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to place bet')
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
    <div className="min-h-screen bg-[#0a0a0f]">
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
            </div>

            {/* Pool stat + share */}
            <div className="flex items-start gap-3 shrink-0">
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] px-6 py-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total Pool</p>
                <p className="text-2xl font-black" style={{ color: cat.color }}>
                  UGX {liveTotal.toLocaleString()}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{(rake * 100).toFixed(0)}% platform fee</p>
              </div>
              <button
                onClick={shareMarket}
                title="Share market"
                className="flex items-center gap-1.5 rounded-2xl border border-[#1e1e2e] bg-[#13131a] px-4 py-3 text-xs font-semibold text-slate-400 hover:border-violet-800/60 hover:text-white transition-colors"
              >
                {copied ? (
                  <><span className="text-emerald-400">✓</span> Copied!</>
                ) : (
                  <><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share</>
                )}
              </button>
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

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Binary head-to-head */}
          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-600">Choose your side</h2>

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

                    <SideVisual v={visual} />

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
                  <span>UGX {liveTotal.toLocaleString()} total pool</span>
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
                      {[1000, 5000, 10000, 50000].map(v => (
                        <button
                          key={v}
                          onClick={() => setAmount(String(v))}
                          className="rounded-lg border border-[#1e1e2e] py-1.5 text-xs text-slate-500 hover:border-violet-700/60 hover:text-white transition-colors"
                        >
                          {v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated payout */}
                  {estPayout !== null && amtNum > 0 && (
                    <div className="rounded-xl bg-[#0a0a0f] px-4 py-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-500">
                        <span>Stake</span>
                        <span>UGX {amtNum.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Platform fee ({(rake * 100).toFixed(0)}%)</span>
                        <span>-UGX {(amtNum * rake).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-[#1e1e2e] pt-1.5 mt-1">
                        <span className="text-slate-300">Est. payout</span>
                        <span style={{ color: cat.color }}>UGX {estPayout.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                      </div>
                      <p className="text-[10px] text-slate-600">Payout updates as others bet</p>
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

                  <p className="text-center text-[11px] text-slate-600">Parimutuel pool · 8% platform rake</p>
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
                <Link
                  href="/markets"
                  className="block rounded-xl border border-[#2a2a3e] py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Browse open markets →
                </Link>
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
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Participants</span>
                <span className="text-slate-300">{liveOpts.reduce((s, o) => s + (Number(o.total_pool) > 0 ? 1 : 0), 0)} active options</span>
              </div>
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
