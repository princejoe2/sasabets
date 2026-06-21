'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
  if (metadata?.type === 'updown') return 'updown'
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

// Curated Unsplash photo IDs per category (permanent CDN URLs)
const CAT_IMAGE: Record<Category, string> = {
  football:       'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&q=70&auto=format&fit=crop',
  politics:       'https://images.unsplash.com/photo-1529107386316-0d2ef31753c0?w=600&q=70&auto=format&fit=crop',
  economy:        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=70&auto=format&fit=crop',
  entertainment:  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=70&auto=format&fit=crop',
  tech:           'https://images.unsplash.com/photo-1512941937938-2bdb01e0f36f?w=600&q=70&auto=format&fit=crop',
  infrastructure: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=70&auto=format&fit=crop',
  agriculture:    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=70&auto=format&fit=crop',
  updown:         'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=70&auto=format&fit=crop',
  default:        'https://images.unsplash.com/photo-1518373714866-3f1b98b28e34?w=600&q=70&auto=format&fit=crop',
}

const CAT = {
  football:       { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.1)',  border: 'rgba(163,230,53,0.28)', bar: '#84cc16', tag: { background: 'rgba(163,230,53,0.18)', color: '#d9f99d' } },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.28)',  bar: '#3b82f6', tag: { background: 'rgba(96,165,250,0.18)',  color: '#bfdbfe' } },
  economy:        { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.28)',  bar: '#f59e0b', tag: { background: 'rgba(251,191,36,0.18)',  color: '#fde68a' } },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.28)', bar: '#ec4899', tag: { background: 'rgba(244,114,182,0.18)', color: '#fbcfe8' } },
  tech:           { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.28)',  bar: '#06b6d4', tag: { background: 'rgba(34,211,238,0.18)',  color: '#a5f3fc' } },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#fb923c', glow: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.28)',  bar: '#f97316', tag: { background: 'rgba(251,146,60,0.18)',  color: '#fed7aa' } },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.28)',  bar: '#10b981', tag: { background: 'rgba(52,211,153,0.18)',  color: '#a7f3d0' } },
  updown:         { icon: '📈', label: 'Up/Down',        color: '#4ade80', glow: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.28)',  bar: '#22c55e', tag: { background: 'rgba(74,222,128,0.18)',  color: '#bbf7d0' } },
  default:        { icon: '🔮', label: 'Prediction',     color: '#a78bfa', glow: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.28)', bar: '#8b5cf6', tag: { background: 'rgba(167,139,250,0.18)', color: '#ddd6fe' } },
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
      if (days >= 2)       { setDisplay(`${days}d ${hours}h left`); setUrgency('normal') }
      else if (days >= 1)  { setDisplay(`${days}d ${hours}h left`); setUrgency('day')    }
      else if (hours >= 1) { setDisplay(`${hours}h ${mins}m left`); setUrgency('hour')   }
      else                 { setDisplay(`${mins}m ${secs}s left`);  setUrgency('final')  }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [closesAt, marketId, isOpen])

  return { display, urgency, expired }
}

const URGENCY_BANNER: Record<Urgency, { text: string; bg: string; border: string; color: string; pulse: boolean } | null> = {
  normal:  null,
  day:     { text: '⚠️ Closing in 24 hours — place your bet!', bg: 'rgba(234,88,12,0.15)', border: '#c2410c', color: '#fb923c', pulse: false },
  hour:    { text: '🔥 Less than 1 hour left — act now!',      bg: 'rgba(239,68,68,0.18)', border: '#dc2626', color: '#f87171', pulse: true  },
  final:   { text: '🚨 FINAL MINUTES — last chance to bet!',   bg: 'rgba(239,68,68,0.25)', border: '#ef4444', color: '#fca5a5', pulse: true  },
  expired: null,
}

export default function MarketCard({ market }: { market: Market }) {
  const router = useRouter()
  const catKey  = detectCategory(market.title, market.description, market.metadata)
  const cat     = CAT[catKey]
  const imgSrc  = CAT_IMAGE[catKey]
  const opts    = market.options
  const total   = Number(market.total_pool)
  const rake    = market.rake_pct ?? 0.08
  const isOpen  = market.status === 'open'

  const { display: countdown, urgency, expired } = useCountdown(market.closes_at, market.id, isOpen)
  const effectivelyOpen = isOpen && !expired

  function oddsFor(opt: Opt) {
    if (total <= 0 || opt.total_pool <= 0) return null
    return ((total * (1 - rake)) / opt.total_pool).toFixed(2)
  }
  function pctFor(opt: Opt) {
    return total > 0 ? (opt.total_pool / total) * 100 : 100 / opts.length
  }

  const countdownColor =
    urgency === 'final' ? '#f87171' :
    urgency === 'hour'  ? '#f87171' :
    urgency === 'day'   ? '#fbbf24' : '#64748b'

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el   = e.currentTarget
    const rect = el.getBoundingClientRect()
    const dx   = ((e.clientX - rect.left) / rect.width  - 0.5) * 2
    const dy   = ((e.clientY - rect.top)  / rect.height - 0.5) * 2
    el.style.transform  = `perspective(900px) rotateX(${dy * -7}deg) rotateY(${dx * 7}deg) translateY(-5px) scale(1.02)`
    el.style.transition = 'transform 0.08s ease'
    el.style.boxShadow  = `0 20px 60px ${cat.glow}, 0 0 0 1px ${cat.border}`
  }
  function onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    el.style.transform  = 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)'
    el.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease'
    el.style.boxShadow  = `0 4px 24px ${cat.glow}`
  }

  return (
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card-shine group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        background: `linear-gradient(145deg, ${cat.glow} 0%, #111118 55%)`,
        border: `1px solid ${urgency === 'final' ? '#ef4444' : urgency === 'hour' ? '#dc2626' : cat.border}`,
        boxShadow: `${urgency === 'final' ? '0 0 30px rgba(239,68,68,0.4), ' : urgency === 'hour' ? '0 0 20px rgba(239,68,68,0.25), ' : ''}0 4px 24px ${cat.glow}`,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Header image */}
      <div className="relative h-36 w-full overflow-hidden shrink-0">
        <Image
          src={imgSrc}
          alt={cat.label}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={false}
        />
        {/* Gradient overlay so text below reads cleanly */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, #111118 100%)` }} />

        {/* Category tag overlaid on image */}
        <div className="absolute bottom-2 left-3">
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-sm"
            style={{ ...cat.tag, border: `1px solid ${cat.border}` }}>
            <span>{cat.icon}</span> {cat.label}
          </span>
        </div>

        {/* Countdown overlaid on image */}
        {(countdown || !isOpen) && (
          <div className="absolute bottom-2 right-3">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tabular-nums backdrop-blur-sm"
              style={{ color: countdownColor, background: `${countdownColor}22`, border: `1px solid ${countdownColor}44` }}>
              {(urgency === 'final' || urgency === 'hour') && countdown !== 'Closed' && !expired && (
                <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block" style={{ background: countdownColor }} />
              )}
              {!isOpen || expired ? 'Closed' : countdown}
            </span>
          </div>
        )}

        {/* Closed overlay */}
        {(!effectivelyOpen) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded-full border border-slate-600 bg-black/70 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-400 backdrop-blur-sm">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Accent bar */}
      <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}40 100%)` }} />

      {/* Ending-soon banner */}
      {(() => {
        const banner = URGENCY_BANNER[urgency]
        if (!banner || !effectivelyOpen) return null
        return (
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider ${banner.pulse ? 'animate-pulse' : ''}`}
            style={{ background: banner.bg, borderBottom: `1px solid ${banner.border}`, color: banner.color }}
          >
            <span>{banner.text}</span>
          </div>
        )
      })()}

      <div className="flex flex-col flex-1 p-5">

        {/* Title */}
        <h3 className="mb-4 font-black leading-tight text-slate-100" style={{ fontSize: '1.05rem', lineHeight: 1.35 }}>
          {market.title}
        </h3>

        {/* Options — A vs B */}
        {opts.length >= 2 && (
          <div className="mb-4" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {opts.slice(0, 2).map((opt, idx) => {
                const isA  = idx === 0
                const color = isA ? '#a78bfa' : '#fbbf24'
                const bg    = isA ? 'rgba(167,139,250,0.09)' : 'rgba(251,191,36,0.07)'
                const bdr   = isA ? 'rgba(167,139,250,0.28)' : 'rgba(251,191,36,0.22)'
                const bgH   = isA ? 'rgba(167,139,250,0.2)'  : 'rgba(251,191,36,0.16)'
                const bdrH  = isA ? 'rgba(167,139,250,0.65)' : 'rgba(251,191,36,0.55)'
                return (
                  <button
                    key={opt.id}
                    disabled={!effectivelyOpen}
                    onClick={() => effectivelyOpen && router.push(`/markets/${market.id}?pick=${opt.id}`)}
                    className="flex flex-col items-center rounded-xl py-3 px-2 transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: bg, border: `1.5px solid ${bdr}` }}
                    onMouseEnter={e => {
                      if (!effectivelyOpen) return
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bgH; el.style.borderColor = bdrH
                      el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 6px 20px ${bg}`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bg; el.style.borderColor = bdr
                      el.style.transform = ''; el.style.boxShadow = ''
                    }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color }}>
                      {isA ? 'A' : 'B'}
                    </span>
                    <span className="text-sm font-black leading-tight text-center" style={{ color }}>{opt.label}</span>
                    <span className="mt-2 text-lg font-black" style={{ color }}>
                      {oddsFor(opt) !== null ? `${oddsFor(opt)}x` : '—'}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold" style={{ color: `${color}70` }}>
                      {pctFor(opt).toFixed(0)}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Split bar */}
            <div className="flex items-center gap-1.5">
              <span className="w-7 text-right text-[10px] font-bold text-violet-500">{pctFor(opts[0]).toFixed(0)}%</span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#1a1a2e]">
                <div className="h-full transition-all duration-500" style={{ width: `${pctFor(opts[0])}%`, background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
                <div className="h-full flex-1" style={{ background: 'linear-gradient(90deg,#b45309,#fbbf24)' }} />
              </div>
              <span className="w-7 text-[10px] font-bold text-amber-500">{pctFor(opts[1]).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-auto" style={{ borderTop: `1px solid ${cat.border}` }}>
          <span className="text-sm text-slate-500">
            Pool: <span className="font-bold text-slate-200">UGX {total.toLocaleString()}</span>
          </span>
          <span className="text-sm font-black transition-all group-hover:scale-110" style={{ color: cat.color }}>
            {effectivelyOpen ? 'Predict →' : 'View →'}
          </span>
        </div>
      </div>
    </div>
  )
}
