'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
}

// ── Category detection ────────────────────────────────────────────────────────

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
  football:       { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.1)',  border: 'rgba(163,230,53,0.28)', bar: '#84cc16', tag: { background: 'rgba(163,230,53,0.18)', color: '#d9f99d' } },
  politics:       { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.28)',  bar: '#3b82f6', tag: { background: 'rgba(96,165,250,0.18)',  color: '#bfdbfe' } },
  economy:        { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.28)',  bar: '#f59e0b', tag: { background: 'rgba(251,191,36,0.18)',  color: '#fde68a' } },
  entertainment:  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.28)', bar: '#ec4899', tag: { background: 'rgba(244,114,182,0.18)', color: '#fbcfe8' } },
  tech:           { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.28)',  bar: '#06b6d4', tag: { background: 'rgba(34,211,238,0.18)',  color: '#a5f3fc' } },
  infrastructure: { icon: '🏗️', label: 'Infrastructure', color: '#fb923c', glow: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.28)',  bar: '#f97316', tag: { background: 'rgba(251,146,60,0.18)',  color: '#fed7aa' } },
  agriculture:    { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.28)',  bar: '#10b981', tag: { background: 'rgba(52,211,153,0.18)',  color: '#a7f3d0' } },
  default:        { icon: '🔮', label: 'Prediction',     color: '#a78bfa', glow: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.28)', bar: '#8b5cf6', tag: { background: 'rgba(167,139,250,0.18)', color: '#ddd6fe' } },
}

// ── Countdown ─────────────────────────────────────────────────────────────────

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
      if (days >= 7)      { setDisplay(`${days}d left`);           setUrgency('normal') }
      else if (days >= 1) { setDisplay(`${days}d ${hours}h left`); setUrgency('soon') }
      else if (hours >= 1){ setDisplay(`${hours}h ${mins}m left`); setUrgency('urgent') }
      else                { setDisplay(`${mins}m ${secs}s`);       setUrgency('urgent') }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [closesAt])

  return { display, urgency }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarketCard({ market }: { market: Market }) {
  const router = useRouter()
  const { display: countdown, urgency } = useCountdown(market.closes_at)
  const cat = CAT[detectCategory(market.title, market.description)]
  const opts = market.options
  const total = Number(market.total_pool)
  const rake = market.rake_pct ?? 0.08
  const isOpen = market.status === 'open'

  function oddsFor(opt: Opt) {
    if (total <= 0 || opt.total_pool <= 0) return null
    return ((total * (1 - rake)) / opt.total_pool).toFixed(2)
  }
  function pctFor(opt: Opt) {
    return total > 0 ? (opt.total_pool / total) * 100 : 100 / opts.length
  }

  const countdownColor =
    urgency === 'urgent' ? '#f87171' :
    urgency === 'soon'   ? '#fbbf24' : '#64748b'

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const dx = (x - cx) / cx   // -1 → 1
    const dy = (y - cy) / cy   // -1 → 1
    const rotX = dy * -9
    const rotY = dx * 9
    // Move inner highlight based on cursor position
    const glowX = 30 + dx * 40   // 0–100%
    const glowY = 30 + dy * 40
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) scale(1.02)`
    el.style.transition = 'transform 0.08s ease'
    el.style.boxShadow = `0 16px 50px ${cat.glow}, 0 0 0 1px ${cat.border}`
    el.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, ${cat.glow} 0%, #111118 55%)`
  }

  function onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)'
    el.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background 0.3s ease'
    el.style.boxShadow = `0 4px 24px ${cat.glow}`
    el.style.background = `linear-gradient(145deg, ${cat.glow} 0%, #111118 55%)`
  }

  return (
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="card-shine group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        background: `linear-gradient(145deg, ${cat.glow} 0%, #111118 55%)`,
        border: `1px solid ${cat.border}`,
        boxShadow: `0 4px 24px ${cat.glow}`,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Coloured top accent bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}40 100%)` }} />

      <div className="flex flex-col flex-1 p-6">

        {/* Category + countdown */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider"
            style={cat.tag}
          >
            <span className="text-sm">{cat.icon}</span> {cat.label}
          </span>

          {countdown && (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black tabular-nums"
              style={{ color: countdownColor, background: `${countdownColor}1a` }}
            >
              {urgency === 'urgent' && countdown !== 'Closed' && (
                <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block" style={{ background: countdownColor }} />
              )}
              {countdown}
            </span>
          )}
        </div>

        {/* Title — big & bold */}
        <h3
          className="mb-5 font-black leading-tight"
          style={{ color: '#f8fafc', fontSize: '1.15rem', lineHeight: 1.3 }}
        >
          {market.title}
        </h3>

        {/* Binary A vs B — always two sides */}
        {opts.length >= 2 && (
          <div className="mb-5" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {opts.slice(0, 2).map((opt, idx) => {
                const isA   = idx === 0
                const color = isA ? '#a78bfa' : '#fbbf24'
                const bg    = isA ? 'rgba(167,139,250,0.09)' : 'rgba(251,191,36,0.07)'
                const bdr   = isA ? 'rgba(167,139,250,0.28)' : 'rgba(251,191,36,0.22)'
                const bgH   = isA ? 'rgba(167,139,250,0.2)'  : 'rgba(251,191,36,0.16)'
                const bdrH  = isA ? 'rgba(167,139,250,0.65)' : 'rgba(251,191,36,0.55)'
                return (
                  <button
                    key={opt.id}
                    onClick={() => router.push(`/markets/${market.id}?pick=${opt.id}`)}
                    className="flex flex-col items-center rounded-xl py-4 px-2 transition-all duration-150 active:scale-95"
                    style={{ background: bg, border: `1.5px solid ${bdr}` }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bgH
                      el.style.borderColor = bdrH
                      el.style.transform = 'translateY(-2px)'
                      el.style.boxShadow = `0 6px 20px ${bg}`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = bg
                      el.style.borderColor = bdr
                      el.style.transform = ''
                      el.style.boxShadow = ''
                    }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color }}>
                      {isA ? 'A' : 'B'}
                    </span>
                    <span className="text-sm font-black leading-tight text-center" style={{ color }}>
                      {opt.label}
                    </span>
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

            {/* Tug-of-war split bar */}
            <div className="flex items-center gap-1.5">
              <span className="w-7 text-right text-[10px] font-bold text-violet-500">
                {pctFor(opts[0]).toFixed(0)}%
              </span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#1a1a2e]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${pctFor(opts[0])}%`,
                    background: 'linear-gradient(90deg,#6d28d9,#a78bfa)',
                  }}
                />
                <div className="h-full flex-1" style={{ background: 'linear-gradient(90deg,#b45309,#fbbf24)' }} />
              </div>
              <span className="w-7 text-[10px] font-bold text-amber-500">
                {pctFor(opts[1]).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4 mt-auto"
          style={{ borderTop: `1px solid ${cat.border}` }}
        >
          <span className="text-sm text-slate-500">
            Pool: <span className="font-bold text-slate-200">UGX {total.toLocaleString()}</span>
          </span>
          <span
            className="text-sm font-black transition-all group-hover:scale-110"
            style={{ color: cat.color }}
          >
            {isOpen ? 'Predict →' : 'View →'}
          </span>
        </div>
      </div>
    </div>
  )
}
