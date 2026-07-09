import type { CSSProperties } from 'react'

type CoinData = {
  id: string
  current_price: number
  price_change_percentage_24h: number
  sparkline_in_7d: { price: number[] }
}

function Sparkline({ prices, color, gid }: { prices: number[]; color: string; gid: string }) {
  const pts = prices.slice(-24)
  if (pts.length < 2) return null

  const min = Math.min(...pts), max = Math.max(...pts)
  const range = max - min || 1
  const W = 200, H = 60, px = 3, py = 5

  const coords = pts.map((p, i) => ({
    x: px + (i / (pts.length - 1)) * (W - 2 * px),
    y: H - py - ((p - min) / range) * (H - 2 * py),
  }))

  const polyPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `M ${coords[0].x.toFixed(1)},${H} ` +
    coords.map(c => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
    ` L ${coords[coords.length - 1].x.toFixed(1)},${H} Z`

  const last = coords[coords.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ display: 'block' } as CSSProperties}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3" fill={color}/>
    </svg>
  )
}

const COIN_META: Record<string, { name: string; sym: string; icon: string; iconColor: string }> = {
  bitcoin:   { name: 'Bitcoin', sym: 'BTC', icon: '₿', iconColor: '#f7931a' },
  'pax-gold': { name: 'Gold',   sym: 'XAU', icon: '✦', iconColor: '#eab308' },
}

export default function PriceTicker({ coins }: { coins: CoinData[] }) {
  if (!coins.length) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {coins.map(coin => {
        const m = COIN_META[coin.id]
        if (!m) return null
        const pct    = coin.price_change_percentage_24h ?? 0
        const isUp   = pct >= 0
        const color  = isUp ? '#22c55e' : '#ef4444'
        const gid    = `spk-${coin.id}`

        return (
          <div key={coin.id} className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d18] p-3 sm:p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none font-black" style={{ color: m.iconColor }}>{m.icon}</span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">{m.sym}</p>
                  <p className="text-[10px] text-slate-600 leading-none">{m.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white tabular-nums">
                  ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: coin.current_price > 100 ? 0 : 2 })}
                </p>
                <p className="text-[11px] font-bold tabular-nums leading-tight" style={{ color }}>
                  {isUp ? '+' : ''}{pct.toFixed(2)}% 24h
                </p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="overflow-hidden rounded-lg bg-[#111120]">
              <Sparkline prices={coin.sparkline_in_7d?.price ?? []} color={color} gid={gid} />
            </div>

            <p className="mt-1.5 text-center text-[10px] text-slate-700">24 h · live · CoinGecko</p>
          </div>
        )
      })}
    </div>
  )
}
