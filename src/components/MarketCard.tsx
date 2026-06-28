'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import OddsSparkline from '@/components/OddsSparkline'
import { getPoolDepth, DEPTH_BADGE } from '@/lib/pool-depth'

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
  football:       { icon: '⚽', label: 'Football',       color: '#65a30d', border: 'rgba(101,163,13,0.3)',  shadow: 'rgba(101,163,13,0.12)', bar: '#84cc16', tag: { background: 'rgba(101,163,13,0.1)', color: '#3f6212', border: 'rgba(101,163,13,0.25)' } },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#2563eb', border: 'rgba(37,99,235,0.3)',   shadow: 'rgba(37,99,235,0.12)',  bar: '#3b82f6', tag: { background: 'rgba(37,99,235,0.08)', color: '#1e3a8a', border: 'rgba(37,99,235,0.25)' } },
  economy:        { icon: '💰', label: 'Economy',        color: '#d97706', border: 'rgba(217,119,6,0.3)',   shadow: 'rgba(217,119,6,0.12)',  bar: '#f59e0b', tag: { background: 'rgba(217,119,6,0.1)', color: '#78350f', border: 'rgba(217,119,6,0.25)' } },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#db2777', border: 'rgba(219,39,119,0.3)',  shadow: 'rgba(219,39,119,0.12)', bar: '#ec4899', tag: { background: 'rgba(219,39,119,0.08)', color: '#831843', border: 'rgba(219,39,119,0.25)' } },
  tech:           { icon: '📱', label: 'Technology',     color: '#0891b2', border: 'rgba(8,145,178,0.3)',   shadow: 'rgba(8,145,178,0.12)',  bar: '#06b6d4', tag: { background: 'rgba(8,145,178,0.08)', color: '#164e63', border: 'rgba(8,145,178,0.25)' } },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#ea580c', border: 'rgba(234,88,12,0.3)',   shadow: 'rgba(234,88,12,0.12)',  bar: '#f97316', tag: { background: 'rgba(234,88,12,0.08)', color: '#7c2d12', border: 'rgba(234,88,12,0.25)' } },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#059669', border: 'rgba(5,150,105,0.3)',   shadow: 'rgba(5,150,105,0.12)',  bar: '#10b981', tag: { background: 'rgba(5,150,105,0.08)', color: '#064e3b', border: 'rgba(5,150,105,0.25)' } },
  updown:         { icon: '📈', label: 'Up/Down',        color: '#16a34a', border: 'rgba(22,163,74,0.3)',   shadow: 'rgba(22,163,74,0.12)',  bar: '#22c55e', tag: { background: 'rgba(22,163,74,0.08)', color: '#14532d', border: 'rgba(22,163,74,0.25)' } },
  default:        { icon: '🔮', label: 'Prediction',     color: '#7c3aed', border: 'rgba(124,58,237,0.3)',  shadow: 'rgba(124,58,237,0.12)', bar: '#8b5cf6', tag: { background: 'rgba(124,58,237,0.08)', color: '#4c1d95', border: 'rgba(124,58,237,0.25)' } },
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
  day:     { text: '⚠️ Closing in 24 hours — place your bet!', bg: 'rgba(234,88,12,0.08)', border: '#fed7aa', color: '#c2410c', pulse: false },
  hour:    { text: '🔥 Less than 1 hour left — act now!',      bg: 'rgba(239,68,68,0.08)', border: '#fecaca', color: '#dc2626', pulse: true  },
  final:   { text: '🚨 FINAL MINUTES — last chance to bet!',   bg: 'rgba(239,68,68,0.12)', border: '#fecaca', color: '#b91c1c', pulse: true  },
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

  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const shareText = encodeURIComponent(`"${market.title}" — Predict on Sabula 256 🔮 https://sabula256.com/markets/${market.id}`)
  const waLink    = `https://wa.me/?text=${shareText}`
  const twLink    = `https://twitter.com/intent/tweet?text=${shareText}`

  useEffect(() => {
    if (!shareOpen) return
    function handle(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
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

  const countdownColor =
    urgency === 'final' ? '#dc2626' :
    urgency === 'hour'  ? '#dc2626' :
    urgency === 'day'   ? '#d97706' : '#94a3b8'

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el   = e.currentTarget
    const rect = el.getBoundingClientRect()
    const dx   = ((e.clientX - rect.left) / rect.width  - 0.5) * 2
    const dy   = ((e.clientY - rect.top)  / rect.height - 0.5) * 2
    el.style.transform  = `perspective(900px) rotateX(${dy * -5}deg) rotateY(${dx * 5}deg) translateY(-4px) scale(1.02)`
    el.style.transition = 'transform 0.08s ease'
    el.style.boxShadow  = `0 12px 40px ${cat.shadow}, 0 0 0 1.5px ${cat.border}`
  }
  function onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    el.style.transform  = 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)'
    el.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease'
    el.style.boxShadow  = `0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px ${cat.border}`
  }

  return (
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card-shine group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer bg-white"
      style={{
        border: `1px solid ${urgency === 'final' ? '#fca5a5' : urgency === 'hour' ? '#fca5a5' : cat.border}`,
        boxShadow: `${urgency === 'final' ? '0 0 20px rgba(239,68,68,0.15), ' : urgency === 'hour' ? '0 0 12px rgba(239,68,68,0.1), ' : ''}0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px ${cat.border}`,
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
        {/* Fade image into card — light uses white, dark uses slate-800 */}
        <div className="absolute inset-0 card-img-fade" />

        {/* Category tag */}
        <div className="absolute bottom-2 left-3">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider backdrop-blur-sm"
            style={{ background: cat.color, color: '#fff', border: `1px solid ${cat.color}`, boxShadow: `0 2px 8px ${cat.color}55` }}
          >
            <span>{cat.icon}</span> {cat.label}
          </span>
        </div>

        {/* Countdown */}
        {(countdown || !isOpen) && (
          <div className="absolute bottom-2 right-3">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tabular-nums backdrop-blur-sm"
              style={{ color: countdownColor, background: `${countdownColor}15`, border: `1px solid ${countdownColor}30` }}
            >
              {(urgency === 'final' || urgency === 'hour') && countdown !== 'Closed' && !expired && (
                <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block" style={{ background: countdownColor }} />
              )}
              {!isOpen || expired ? 'Closed' : countdown}
            </span>
          </div>
        )}

        {/* Closed overlay */}
        {(!effectivelyOpen) && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 flex items-center justify-center">
            <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-500 backdrop-blur-sm">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Accent bar */}
      <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}60 60%, ${cat.color}20 100%)` }} />

      {/* Ending-soon banner */}
      {(() => {
        const banner = URGENCY_BANNER[urgency]
        if (!banner || !effectivelyOpen) return null
        return (
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold ${banner.pulse ? 'animate-pulse' : ''}`}
            style={{ background: banner.bg, borderBottom: `1px solid ${banner.border}`, color: banner.color }}
          >
            {banner.text}
          </div>
        )
      })()}

      <div className="flex flex-col flex-1 p-5">

        {/* Title */}
        <h3 className="mb-4 font-black leading-tight text-slate-900" style={{ fontSize: '1.35rem', lineHeight: 1.25 }}>
          {market.title}
        </h3>

        {/* Options — A vs B */}
        {opts.length >= 2 && (
          <div className="mb-4" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {opts.slice(0, 2).map((opt, idx) => {
                const isA   = idx === 0
                const color = isA ? '#6d28d9' : '#b45309'
                const bg    = isA ? 'rgba(109,40,217,0.06)'  : 'rgba(180,83,9,0.05)'
                const bdr   = isA ? 'rgba(109,40,217,0.25)'  : 'rgba(180,83,9,0.2)'
                const bgH   = isA ? 'rgba(109,40,217,0.12)'  : 'rgba(180,83,9,0.1)'
                const bdrH  = isA ? 'rgba(109,40,217,0.5)'   : 'rgba(180,83,9,0.45)'
                return (
                  <button
                    key={opt.id}
                    disabled={!effectivelyOpen}
                    onClick={() => effectivelyOpen && router.push(`/markets/${market.id}?pick=${opt.id}`)}
                    className="flex flex-col items-center rounded-xl py-3 px-2 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: bg, border: `1.5px solid ${bdr}` }}
                    onMouseEnter={e => {
                      if (!effectivelyOpen) return
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bgH; el.style.borderColor = bdrH
                      el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 4px 12px ${bg}`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bg; el.style.borderColor = bdr
                      el.style.transform = ''; el.style.boxShadow = ''
                    }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color }}>
                      {isA ? 'A' : 'B'}
                    </span>
                    <span className="text-base font-black leading-tight text-center break-words w-full" style={{ color }}>{opt.label}</span>
                    <span className="mt-2 text-3xl font-black" style={{ color }}>
                      {oddsFor(opt) !== null ? `${oddsFor(opt)}x` : '—'}
                    </span>
                    <span className="mt-0.5 text-xs font-semibold" style={{ color: `${color}80` }}>
                      {pctFor(opt).toFixed(0)}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Split bar */}
            <div className="flex items-center gap-1.5">
              <span className="w-7 text-right text-[10px] font-bold text-violet-700">{pctFor(opts[0]).toFixed(0)}%</span>
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full transition-all duration-500" style={{ width: `${pctFor(opts[0])}%`, background: 'linear-gradient(90deg,#6d28d9,#8b5cf6)' }} />
                <div className="h-full flex-1" style={{ background: 'linear-gradient(90deg,#b45309,#f59e0b)' }} />
              </div>
              <span className="w-7 text-[10px] font-bold text-amber-700">{pctFor(opts[1]).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Pool depth badge */}
        {(() => {
          const depth = getPoolDepth(total)
          const badge = DEPTH_BADGE[depth.rating]
          return (
            <div className="mb-3 flex items-center gap-2">
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}
              >
                {badge.icon} {depth.label}
              </span>
              {opts.length >= 2 && total > 0 && (
                <span className="text-[10px] text-slate-400">
                  {Math.round((opts[0].total_pool / total) * 100)}% / {Math.round((opts[1].total_pool / total) * 100)}%
                </span>
              )}
            </div>
          )
        })()}

        {/* Sparkline + footer */}
        <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${cat.border}` }}>
          {total > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Odds history</span>
              <OddsSparkline marketId={market.id} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Pool: <span className="font-black text-slate-800">UGX {total.toLocaleString()}</span>
            </span>
            <div className="flex items-center gap-2">
              {/* Share button + popover */}
              <div ref={shareRef} className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShareOpen(o => !o) }}
                  title="Share market"
                  className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                {shareOpen && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-8 left-0 z-20 flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={twLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white"
                    >
                      𝕏 Tweet
                    </a>
                  </div>
                )}
              </div>
              <span className="text-base font-black transition-all group-hover:scale-110" style={{ color: cat.color }}>
                {effectivelyOpen ? 'Predict →' : 'View →'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
