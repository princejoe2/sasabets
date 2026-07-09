'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import OddsSparkline from '@/components/OddsSparkline'
import { getPoolDepth, DEPTH_BADGE } from '@/lib/pool-depth'
import { useWatchlist } from '@/hooks/useWatchlist'
import { getEntityLogo, getEntityLogoFromTitle } from '@/lib/entity-logos'
import EntityLogo from '@/components/EntityLogo'

interface Opt { id: string; label: string; total_pool: number }
interface Market {
  id: string
  title: string
  description?: string
  total_pool: number
  options: Opt[]
  closes_at: string | null
  status: string
  rake_pct?: number
  metadata?: Record<string, unknown>
}

type Category = 'football' | 'politics' | 'economy' | 'entertainment' | 'tech' | 'infrastructure' | 'agriculture' | 'updown' | 'default'

function detectCategory(title: string, desc = '', metadata?: Record<string, unknown>): Category {
  if (metadata?.type === 'updown' || metadata?.type === 'price_level') return 'updown'
  const stored = metadata?.category as string | undefined
  if (stored && stored in CAT) return stored as Category
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|premier.?league|fufa|kcca.*fc|vipers|express.?fc|cranes|afcon|scorer|derby|sc.villa|bul.fc|world.?cup|golden.?boot/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|social.?media.?tax|vote|contest|nup|nrm|minister/.test(t)) return 'politics'
  if (/oil|exchange.?rate|ugx.*usd|usd.*ugx|bank|share.?price|bitcoin|btc|crypto|gdp|shilling|profit|economy|coffee|robusta/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|eddy.?kenzo|chameleone|fik.?fameica|pallaso|winnie.?nwagi|headline/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel.?money|mtn.?momo|telecom|users.?in.?uganda/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road|kampala.*jinja|construction|bridge/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|long.?rains|harvest|maize|coffee/.test(t)) return 'agriculture'
  return 'default'
}

const CAT = {
  football:       { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.06)',  border: 'rgba(163,230,53,0.22)',  bar: '#84cc16' },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.06)',  border: 'rgba(96,165,250,0.22)',  bar: '#3b82f6' },
  economy:        { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.06)',  border: 'rgba(251,191,36,0.22)',  bar: '#f59e0b' },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.06)', border: 'rgba(244,114,182,0.22)', bar: '#ec4899' },
  tech:           { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.06)',  border: 'rgba(34,211,238,0.22)',  bar: '#06b6d4' },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#fb923c', glow: 'rgba(251,146,60,0.06)',  border: 'rgba(251,146,60,0.22)',  bar: '#f97316' },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.22)',  bar: '#10b981' },
  updown:         { icon: '📈', label: 'Up/Down',        color: '#4ade80', glow: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.22)',  bar: '#22c55e' },
  default:        { icon: '🔮', label: 'Prediction',     color: '#a78bfa', glow: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.22)', bar: '#8b5cf6' },
}

type Urgency = 'normal' | 'day' | 'hour' | 'final' | 'expired'

function useCountdown(closesAt: string | null, marketId: string, isOpen: boolean) {
  const [display, setDisplay] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('normal')
  const [expired, setExpired] = useState(false)
  const closedRef = useRef(false)

  useEffect(() => {
    if (!closesAt || !isOpen) return
    function update() {
      const diff = new Date(closesAt!).getTime() - Date.now()
      if (diff <= 0) {
        setDisplay('Closed'); setUrgency('expired'); setExpired(true)
        if (!closedRef.current) {
          closedRef.current = true
          fetch('/api/market/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketId }),
          })
        }
        return
      }
      const days  = Math.floor(diff / 86_400_000)
      const hours = Math.floor((diff % 86_400_000) / 3_600_000)
      const mins  = Math.floor((diff % 3_600_000) / 60_000)
      const secs  = Math.floor((diff % 60_000) / 1_000)
      if (days >= 2)       { setDisplay(`${days}d ${hours}h`); setUrgency('normal') }
      else if (days >= 1)  { setDisplay(`${days}d ${hours}h`); setUrgency('day')    }
      else if (hours >= 1) { setDisplay(`${hours}h ${mins}m`); setUrgency('hour')   }
      else                 { setDisplay(`${mins}m ${secs}s`);  setUrgency('final')  }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [closesAt, marketId, isOpen])

  return { display, urgency, expired }
}

export default function MarketCard({ market }: { market: Market }) {
  const router = useRouter()
  const catKey  = detectCategory(market.title, market.description, market.metadata)
  const cat     = CAT[catKey]
  const opts    = market.options
  const total   = Number(market.total_pool)
  const rake    = market.rake_pct ?? 0.08
  const isOpen  = market.status === 'open'

  const { display: countdown, urgency, expired } = useCountdown(market.closes_at, market.id, isOpen)
  const effectivelyOpen = isOpen && !expired

  // Asset market (updown / price_level) live price
  const meta = market.metadata ?? {}
  const isAssetMarket = meta.type === 'updown' || meta.type === 'price_level'
  const isPriceLevel  = meta.type === 'price_level'
  const isUpDown      = meta.type === 'updown'
  const assetId       = isAssetMarket ? String(meta.asset ?? 'bitcoin') : null
  const refPrice      = isUpDown ? Number(meta.entry_price ?? 0) : (isPriceLevel ? Number(meta.target_price ?? 0) : 0)
  const direction     = isPriceLevel ? String(meta.direction ?? 'above') : 'above'
  const [livePrice, setLivePrice] = useState<number | null>(null)

  useEffect(() => {
    if (!isAssetMarket || !assetId) return
    let cancelled = false
    async function fetchPrice() {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`, { cache: 'no-store' })
        const d = await r.json()
        if (!cancelled) setLivePrice(d[assetId!]?.usd ?? null)
      } catch { /* ignore */ }
    }
    fetchPrice()
    const id = setInterval(fetchPrice, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [isAssetMarket, assetId])

  const optA = opts?.[0]?.label ?? ''
  const optB = opts?.[1]?.label ?? ''
  const metaPartyImage = market.metadata?.partyImage as string | undefined
  const metaTeam1Image = market.metadata?.team1Image as string | undefined
  const metaTeam2Image = market.metadata?.team2Image as string | undefined
  let logoA = metaTeam1Image || getEntityLogo(optA)
  let logoB = metaTeam2Image || getEntityLogo(optB)
  if (!logoA && !logoB) {
    const fromTitle = getEntityLogoFromTitle(market.title)
    logoA = fromTitle.logoA
    logoB = fromTitle.logoB
  }
  if (!logoA && !logoB && metaPartyImage) logoA = metaPartyImage
  const hasBothLogos = !!(logoA && logoB) && !isAssetMarket

  const { isWatched, toggle, loaded } = useWatchlist()
  const bookmarked = loaded && isWatched(market.id)

  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const shareText = encodeURIComponent(`"${market.title}" — Predict on Sabula 256 🔮 https://sabula256.com/markets/${market.id}`)
  const waLink    = `https://wa.me/?text=${shareText}`
  const twLink    = `https://twitter.com/intent/tweet?text=${shareText}`

  useEffect(() => {
    if (!shareOpen) return
    function handle(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [shareOpen])

  function oddsFor(opt: Opt) {
    if (total <= 0 || opt.total_pool <= 0) return null
    return ((total * (1 - rake)) / opt.total_pool).toFixed(2)
  }
  function pctFor(opt: Opt) {
    return total > 0 ? (opt.total_pool / total) * 100 : 100 / opts.length
  }

  // Urgency-driven card border
  const urgencyBorderColor =
    urgency === 'final'   ? 'rgba(239,68,68,0.65)' :
    urgency === 'hour'    ? 'rgba(249,115,22,0.55)' :
    urgency === 'day'     ? 'rgba(249,115,22,0.3)'  : '#1e1e2e'

  const urgencyGlow =
    urgency === 'final'   ? '0 0 20px rgba(239,68,68,0.14)' :
    urgency === 'hour'    ? '0 0 14px rgba(249,115,22,0.1)' : ''

  // Side A = green (YES), Side B = red (NO) — design system colors
  const COLOR_A = '#00ff88'
  const COLOR_B = '#ff3366'

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el   = e.currentTarget
    const rect = el.getBoundingClientRect()
    const dx   = ((e.clientX - rect.left) / rect.width  - 0.5) * 2
    const dy   = ((e.clientY - rect.top)  / rect.height - 0.5) * 2
    el.style.transform  = `perspective(900px) rotateX(${dy * -4}deg) rotateY(${dx * 4}deg) translateY(-3px) scale(1.015)`
    el.style.transition = 'transform 0.08s ease'
    el.style.boxShadow  = `${urgencyGlow ? urgencyGlow + ', ' : ''}0 12px 36px rgba(0,0,0,0.35), 0 0 0 1.5px ${urgencyBorderColor}`
  }
  function onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    el.style.transform  = 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)'
    el.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease'
    el.style.boxShadow  = `${urgencyGlow ? urgencyGlow + ', ' : ''}0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px ${urgencyBorderColor}`
  }

  return (
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card-shine group relative flex flex-col h-full overflow-hidden rounded-2xl cursor-pointer active:scale-[0.98]"
      style={{
        background: '#13131a',
        border: `1.5px solid ${urgencyBorderColor}`,
        boxShadow: `${urgencyGlow ? urgencyGlow + ', ' : ''}0 2px 12px rgba(0,0,0,0.25)`,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
      }}
    >
      {/* Community badge */}
      {!!market.metadata?.user_created && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider"
          style={{ background: 'rgba(0,255,136,0.07)', borderBottom: '1px solid rgba(0,255,136,0.15)', color: '#00ff88' }}
        >
          <span>🌍</span>
          Community · {String(market.metadata.creator_name ?? 'Member')}
        </div>
      )}

      {/* Urgency top strip */}
      {effectivelyOpen && (urgency === 'final' || urgency === 'hour' || urgency === 'day') && (
        <div
          className={`flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${urgency === 'final' ? 'animate-pulse' : ''}`}
          style={{
            background: urgency === 'final' ? 'rgba(239,68,68,0.14)' : 'rgba(249,115,22,0.1)',
            borderBottom: `1px solid ${urgency === 'final' ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.2)'}`,
            color: urgency === 'final' ? '#f87171' : '#fb923c',
          }}
        >
          <span>⏰</span>
          {urgency === 'final' ? 'FINAL MINUTES — LAST CHANCE' : urgency === 'hour' ? 'ENDS SOON' : 'CLOSING IN 24H'}
        </div>
      )}

      <div className="flex flex-col flex-1 p-4">


        {/* ── Asset market layout with compact speedometer ── */}
        {isAssetMarket && (() => {
          const pct = livePrice !== null && refPrice > 0 ? ((livePrice - refPrice) / refPrice) * 100 : null
          const invert = isPriceLevel && direction === 'below'
          const winning = pct !== null && (isUpDown ? pct >= 0 : invert ? pct <= 0 : pct >= 0)
          const clamped = pct !== null ? Math.max(-10, Math.min(10, pct)) : 0
          const needleDeg = 90 - clamped * (invert ? -9 : 9)
          const nRad = needleDeg * Math.PI / 180
          const cx = 100, cy = 95, needleR = 66
          const nx = cx + needleR * Math.cos(nRad)
          const ny = cy - needleR * Math.sin(nRad)
          const leftColor  = invert ? '#22c55e' : '#ef4444'
          const rightColor = invert ? '#ef4444' : '#22c55e'
          const leftLabel  = isUpDown ? 'DOWN' : (invert ? 'YES' : 'NO')
          const rightLabel = isUpDown ? 'UP'   : (invert ? 'NO'  : 'YES')
          return (
            <>
              {/* Title */}
              <h3 className="text-[13px] font-bold leading-snug text-slate-100 mb-2 line-clamp-2">
                {market.title}
              </h3>

              {/* Live price row */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-base font-black text-white tabular-nums">
                    {livePrice !== null ? `$${livePrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  </span>
                  {pct !== null && (
                    <span className={`text-[11px] font-black ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  ref ${refPrice.toLocaleString()}
                </span>
              </div>

              {/* Compact speedometer */}
              <div className="flex justify-center mb-1">
                <svg viewBox="0 0 200 112" className="w-full max-w-[150px]">
                  <path d="M 26 95 A 74 74 0 0 1 174 95" fill="none" stroke="#1e1e2e" strokeWidth="14" strokeLinecap="round" />
                  <path d="M 26 95 A 74 74 0 0 1 100 21" fill="none" stroke={leftColor}  strokeWidth="10" strokeLinecap="butt" opacity="0.65" />
                  <path d="M 100 21 A 74 74 0 0 1 174 95" fill="none" stroke={rightColor} strokeWidth="10" strokeLinecap="butt" opacity="0.65" />
                  <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="white" strokeWidth="3" strokeLinecap="round" />
                  <circle cx={cx} cy={cy} r="5" fill="white" />
                  <circle cx={cx} cy={cy} r="2" fill="#13131a" />
                  <text x="18"  y="110" fill={leftColor}  fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="monospace">{leftLabel}</text>
                  <text x="182" y="110" fill={rightColor} fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="monospace">{rightLabel}</text>
                </svg>
              </div>

              {/* Status + category + countdown */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
                  style={{ background: `${cat.color}14`, color: cat.color, border: `1px solid ${cat.color}28` }}
                >
                  {cat.icon} {isPriceLevel ? 'Price Target' : 'Up/Down'}
                </span>
                {pct !== null && (
                  <span className={`text-[10px] font-black ${winning ? 'text-emerald-400' : 'text-red-400'}`}>
                    {winning ? '✓' : '✗'} {isUpDown ? (pct >= 0 ? 'UP' : 'DOWN') : (invert ? (pct <= 0 ? 'YES' : 'NO') : (pct >= 0 ? 'YES' : 'NO'))} winning
                  </span>
                )}
                {effectivelyOpen && countdown && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ml-auto"
                    style={{ color: urgency === 'final' || urgency === 'hour' ? '#fb923c' : '#64748b', background: urgency === 'final' || urgency === 'hour' ? 'rgba(249,115,22,0.1)' : '#1e1e2e' }}>
                    ⏱ {countdown}
                  </span>
                )}
                {!effectivelyOpen && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase ml-auto">Closed</span>}
              </div>
            </>
          )
        })()}

        {/* ── VS layout (both logos available) ── */}
        {!isAssetMarket && hasBothLogos ? (
          <>
            {/* Header: category icon + date */}
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
              {market.closes_at && effectivelyOpen && (
                <span className="text-[10px] font-medium text-slate-600">
                  {new Date(market.closes_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' })}
                </span>
              )}
              {!effectivelyOpen && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">Closed</span>
              )}
            </div>

            {/* VS matchup row */}
            <div className="flex items-center justify-around mb-3">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <EntityLogo name={optA} src={logoA} size={44} shape="circle" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate max-w-[76px] text-center">{optA}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-black"
                  style={{ background: 'rgba(0,255,136,0.12)', color: COLOR_A }}
                >
                  {opts[0] ? (oddsFor(opts[0]) ?? '—') + 'x' : '—'}
                </span>
              </div>

              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                vs
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1">
                <EntityLogo name={optB} src={logoB} size={44} shape="circle" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate max-w-[76px] text-center">{optB}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-black"
                  style={{ background: 'rgba(255,51,102,0.1)', color: COLOR_B }}
                >
                  {opts[1] ? (oddsFor(opts[1]) ?? '—') + 'x' : '—'}
                </span>
              </div>
            </div>

            {/* Title (shorter for vs cards) */}
            <h3 className="text-[13px] font-bold leading-snug text-slate-300 mb-3 line-clamp-2">
              {market.title}
            </h3>
          </>
        ) : (!isAssetMarket && (
          /* ── Single-party layout ── */
          <>
            {/* Icon + question */}
            <div className="flex gap-3 mb-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 relative"
                style={{ background: `${cat.color}14`, border: `1.5px solid ${cat.color}28` }}
              >
                {/* Use entity logo if one side has it, else category icon */}
                {(logoA || logoB) ? (
                  <EntityLogo
                    name={logoA ? optA : optB}
                    src={(logoA ?? logoB)!}
                    size={48}
                    shape="circle"
                  />
                ) : (
                  cat.icon
                )}
                {/* Live dot */}
                {effectivelyOpen && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#13131a]" />
                )}
              </div>

              <h3 className="text-[13.5px] font-bold leading-snug text-slate-100 line-clamp-3 flex-1 mt-0.5">
                {market.title}
              </h3>
            </div>

            {/* Category + urgency/time pills */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
                style={{ background: `${cat.color}14`, color: cat.color, border: `1px solid ${cat.color}28` }}
              >
                {cat.icon} {cat.label}
              </span>
              {effectivelyOpen && countdown && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{
                    color: urgency === 'final' || urgency === 'hour' ? '#fb923c' : '#64748b',
                    background: urgency === 'final' || urgency === 'hour' ? 'rgba(249,115,22,0.1)' : '#1e1e2e',
                  }}
                >
                  ⏱ {countdown}
                </span>
              )}
              {!effectivelyOpen && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">Closed</span>
              )}
            </div>
          </>
        ))}

        {/* Probability split bar (2-option markets with pool) */}
        {opts.length >= 2 && total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span style={{ color: COLOR_A }}>{pctFor(opts[0]).toFixed(0)}%</span>
              {opts.length >= 2 && <span style={{ color: COLOR_B }}>{pctFor(opts[1]).toFixed(0)}%</span>}
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,51,102,0.18)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${pctFor(opts[0])}%`, background: 'linear-gradient(90deg,#00cc66,#00ff88)' }}
              />
              <div className="h-full flex-1" style={{ background: 'linear-gradient(90deg,rgba(255,51,102,0.4),rgba(255,51,102,0.6))' }} />
            </div>
          </div>
        )}

        {/* Bet buttons with inline odds */}
        {opts.length >= 2 && (
          <div className="grid grid-cols-2 gap-2 mb-3" onClick={e => e.stopPropagation()}>
            {opts.slice(0, 2).map((opt, idx) => {
              const isA    = idx === 0
              const color  = isA ? COLOR_A : COLOR_B
              const bg     = isA ? 'rgba(0,255,136,0.08)' : 'rgba(255,51,102,0.08)'
              const border = isA ? 'rgba(0,255,136,0.3)'  : 'rgba(255,51,102,0.28)'
              const odds   = oddsFor(opt)
              return (
                <button
                  key={opt.id}
                  disabled={!effectivelyOpen}
                  onClick={() => effectivelyOpen && router.push(`/markets/${market.id}?pick=${opt.id}`)}
                  className="rounded-xl py-2.5 px-3 text-xs font-bold transition-all duration-100 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  style={{ background: bg, border: `1.5px solid ${border}`, color }}
                  onMouseEnter={e => {
                    if (!effectivelyOpen) return
                    const el = e.currentTarget
                    el.style.background = isA ? 'rgba(0,255,136,0.16)' : 'rgba(255,51,102,0.16)'
                    el.style.borderColor = isA ? 'rgba(0,255,136,0.55)' : 'rgba(255,51,102,0.5)'
                    el.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = bg; el.style.borderColor = border; el.style.transform = ''
                  }}
                >
                  <span className="truncate max-w-[64px]">{opt.label}</span>
                  {odds !== null && (
                    <span className="text-[11px] opacity-70 flex-shrink-0">{odds}x</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Footer: depth badge + sparkline + pool + actions */}
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid #1e1e2e' }}>
          {total > 0 && (
            <div className="flex items-center justify-between mb-2">
              {(() => {
                const depth = getPoolDepth(total)
                const badge = DEPTH_BADGE[depth.rating]
                return (
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}
                  >
                    {badge.icon} {depth.label}
                  </span>
                )
              })()}
              <OddsSparkline marketId={market.id} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">
              UGX <span className="text-slate-400 font-bold">{total.toLocaleString()}</span>
            </span>

            <div className="flex items-center gap-1">
              {/* Share */}
              <div ref={shareRef} className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShareOpen(o => !o) }}
                  title="Share"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
                  style={{ background: '#1a1a2e' }}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                {shareOpen && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-8 left-0 z-20 flex gap-2 rounded-xl p-2 shadow-xl"
                    style={{ background: '#13131a', border: '1px solid #2a2a3e' }}
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white">WhatsApp</a>
                    <a href={twLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 rounded-lg bg-black px-2.5 py-1.5 text-[11px] font-bold text-white">𝕏</a>
                  </div>
                )}
              </div>

              {/* Bookmark */}
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(market.id) }}
                aria-label={bookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${bookmarked ? 'text-amber-500' : 'text-slate-700 hover:text-slate-500'}`}
                style={{ background: '#1a1a2e' }}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z"/>
                </svg>
              </button>

              <span className="text-xs font-black ml-1 transition-all group-hover:translate-x-0.5" style={{ color: cat.color }}>
                {effectivelyOpen ? 'Predict →' : 'View →'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
