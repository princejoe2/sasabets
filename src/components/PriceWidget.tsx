'use client'
import { useEffect, useState } from 'react'

interface BtcData { price: number; change24h: number }
interface FxData  { ugx: number; kes: number; tzs: number; updatedAt: string }

function Arrow({ v }: { v: number }) {
  return <span className={v >= 0 ? 'text-emerald-400' : 'text-red-400'}>{v >= 0 ? '▲' : '▼'}</span>
}

export default function PriceWidget() {
  const [btc, setBtc]         = useState<BtcData | null>(null)
  const [fx,  setFx]          = useState<FxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    const [b, f] = await Promise.all([
      fetch('/api/prices/btc').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/prices/ugx').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    if (b && !b.error) setBtc(b)
    if (f && !f.error) setFx(f)
    setLoading(false)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 space-y-3 animate-pulse">
        <div className="h-3 w-24 rounded bg-[#1e1e2e]" />
        <div className="h-5 w-full rounded bg-[#1e1e2e]" />
        <div className="h-5 w-full rounded bg-[#1e1e2e]" />
      </div>
    )
  }

  if (!btc && !fx) return null

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
      <div className="border-b border-[#1e1e2e] px-4 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Live Prices</p>
        {lastRefresh && (
          <p className="text-[9px] text-slate-700">
            {lastRefresh.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* BTC/USD */}
      {btc && (
        <div className="flex items-center justify-between border-b border-[#1e1e2e] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-sm font-black text-amber-400">₿</span>
            <span className="text-xs font-bold text-slate-400">BTC / USD</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-200">
              ${btc.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] font-bold">
              <Arrow v={btc.change24h} /> {Math.abs(btc.change24h).toFixed(2)}% 24h
            </p>
          </div>
        </div>
      )}

      {/* UGX / USD */}
      {fx && (
        <div className="flex items-center justify-between border-b border-[#1e1e2e] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">🇺🇬</span>
            <span className="text-xs font-bold text-slate-400">UGX / USD</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-200">
              {fx.ugx.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-600">shillings per $1</p>
          </div>
        </div>
      )}

      {/* KES / USD */}
      {fx && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-sm">🇰🇪</span>
            <span className="text-xs font-bold text-slate-400">KES / USD</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-200">
              {fx.kes.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-600">shillings per $1</p>
          </div>
        </div>
      )}

      <div className="border-t border-[#1e1e2e] px-4 py-1.5 text-[9px] text-slate-700">
        CoinGecko · ExchangeRate-API · auto-refreshes
      </div>
    </div>
  )
}
