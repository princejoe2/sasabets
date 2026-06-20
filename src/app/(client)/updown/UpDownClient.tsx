'use client'
import Link from 'next/link'

type Market = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: Array<{ id: string; label: string; total_pool: number }>
  closes_at: string | null
  status: string
  rake_pct: number
  metadata: Record<string, unknown>
}

const ASSET_META: Record<string, { sym: string; color: string; bg: string; border: string }> = {
  bitcoin:     { sym: 'BTC', color: '#f7931a', bg: 'rgba(247,147,26,0.08)',  border: 'rgba(247,147,26,0.25)' },
  ethereum:    { sym: 'ETH', color: '#627eea', bg: 'rgba(98,126,234,0.08)',  border: 'rgba(98,126,234,0.25)' },
  solana:      { sym: 'SOL', color: '#9945ff', bg: 'rgba(153,69,255,0.08)',  border: 'rgba(153,69,255,0.25)' },
  binancecoin: { sym: 'BNB', color: '#f3ba2f', bg: 'rgba(243,186,47,0.08)',  border: 'rgba(243,186,47,0.25)' },
  ripple:      { sym: 'XRP', color: '#00aae4', bg: 'rgba(0,170,228,0.08)',   border: 'rgba(0,170,228,0.25)' },
}

function useTimeLeft(closesAt: string | null): string {
  if (!closesAt) return ''
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

export default function UpDownClient({ markets, prices }: { markets: Market[]; prices: Record<string, number> }) {
  if (markets.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-16 text-center space-y-3">
        <div className="text-5xl">📊</div>
        <p className="font-bold text-slate-400">No active Up/Down markets right now</p>
        <p className="text-sm text-slate-600">Check back soon — new crypto prediction windows open daily.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {markets.map(m => {
        const meta    = m.metadata as Record<string, string | number>
        const assetId = String(meta.asset ?? 'bitcoin')
        const a       = ASSET_META[assetId] ?? ASSET_META.bitcoin
        const entry   = Number(meta.entry_price ?? 0)
        const current = prices[assetId]
        const pctMove = entry && current ? ((current - entry) / entry) * 100 : null
        const opts    = m.options
        const upPool  = Number(opts.find(o => o.label.toLowerCase().includes('up'))?.total_pool ?? 0)
        const dnPool  = Number(opts.find(o => o.label.toLowerCase().includes('down'))?.total_pool ?? 0)
        const total   = Number(m.total_pool)
        const upPct   = total > 0 ? (upPool / total) * 100 : 50
        const timeLeft = useTimeLeft(m.closes_at)

        return (
          <Link
            key={m.id}
            href={`/markets/${m.id}`}
            className="group relative rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg block"
            style={{ background: a.bg, borderColor: a.border, boxShadow: 'none' }}
          >
            {/* Asset badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg px-2.5 py-1 text-xs font-black" style={{ background: `${a.color}20`, color: a.color }}>
                  {a.sym}
                </span>
                {meta.window_label && (
                  <span className="text-xs text-slate-600 font-semibold">{String(meta.window_label)}</span>
                )}
              </div>
              {timeLeft && (
                <span className="text-xs font-bold" style={{ color: timeLeft.includes('m') && !timeLeft.includes('h') ? '#f87171' : '#64748b' }}>
                  {timeLeft}
                </span>
              )}
            </div>

            <h3 className="font-black text-white text-base leading-snug">{m.title}</h3>

            {/* Entry price vs current */}
            {entry > 0 && (
              <div className="mt-3 flex items-center gap-3 text-xs">
                <div>
                  <p className="text-slate-600">Entry price</p>
                  <p className="font-black text-slate-300">${entry.toLocaleString()}</p>
                </div>
                {current && (
                  <>
                    <div className="h-4 w-px bg-[#2a2a3e]" />
                    <div>
                      <p className="text-slate-600">Current</p>
                      <p className="font-black" style={{ color: current >= entry ? '#4ade80' : '#f87171' }}>
                        ${current.toLocaleString()}
                      </p>
                    </div>
                    {pctMove !== null && (
                      <>
                        <div className="h-4 w-px bg-[#2a2a3e]" />
                        <div>
                          <p className="text-slate-600">Move</p>
                          <p className="font-black" style={{ color: pctMove >= 0 ? '#4ade80' : '#f87171' }}>
                            {pctMove >= 0 ? '+' : ''}{pctMove.toFixed(2)}%
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* UP / DOWN bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-emerald-400">▲ UP {upPct.toFixed(0)}%</span>
                <span className="text-red-400">{(100 - upPct).toFixed(0)}% DOWN ▼</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[#1a1a2e]">
                <div className="h-full transition-all" style={{ width: `${upPct}%`, background: 'linear-gradient(90deg,#16a34a,#4ade80)' }} />
                <div className="h-full flex-1" style={{ background: 'linear-gradient(90deg,#b91c1c,#f87171)' }} />
              </div>
            </div>

            {/* Pool */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Pool: <span className="font-bold text-slate-400">UGX {Number(total).toLocaleString()}</span>
              </span>
              <span className="text-xs font-bold transition-colors" style={{ color: a.color }}>
                Predict →
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
