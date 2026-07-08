'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ASSETS = [
  { id: 'bitcoin',  sym: 'BTC', name: 'Bitcoin', color: '#f7931a' },
  { id: 'pax-gold', sym: 'XAU', name: 'Gold',    color: '#eab308' },
]

const WINDOWS = [
  { label: '1 hour',   hours: 1  },
  { label: '4 hours',  hours: 4  },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
]

const MARKET_TYPES = [
  { id: 'updown', label: 'Up / Down',   desc: 'Higher or lower than entry price?' },
  { id: 'above',  label: 'Above Price', desc: 'Will it close above a target?' },
  { id: 'below',  label: 'Below Price', desc: 'Will it close below a target?' },
]

type MarketType = 'updown' | 'above' | 'below'
type LivePrice = Record<string, number>

function defaultCloseDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function CreateUpDownClient() {
  const router = useRouter()
  const [prices,      setPrices]      = useState<LivePrice>({})
  const [asset,       setAsset]       = useState('bitcoin')
  const [marketType,  setMarketType]  = useState<MarketType>('updown')
  const [window_h,    setWindowH]     = useState(1)
  const [targetPrice, setTargetPrice] = useState('')
  const [closesAt,    setClosesAt]    = useState(defaultCloseDate)
  const [creating,    setCreating]    = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [recent,      setRecent]      = useState<Array<{ id: string; title: string; closes_at: string }>>([])

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=usd')
      .then(r => r.json())
      .then(data => {
        const p: LivePrice = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, (v as { usd: number }).usd])
        )
        setPrices(p)
        if (!targetPrice) setTargetPrice(String(Math.round((p['bitcoin'] ?? 0) * 1.02)))
      })
      .catch(() => null)

    fetch('/api/admin/create-updown?list=true')
      .then(r => r.json())
      .then(d => setRecent(d.markets ?? []))
      .catch(() => null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const p = prices[asset]
    if (!p || marketType === 'updown') return
    setTargetPrice(String(Math.round(marketType === 'above' ? p * 1.02 : p * 0.98)))
  }, [asset, marketType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    const currentPrice = prices[asset]
    if (!currentPrice) { setMsg({ text: 'Could not fetch current price. Try again.', ok: false }); return }

    let body: Record<string, unknown>
    if (marketType === 'updown') {
      body = { asset, market_type: 'updown', window_hours: window_h, entry_price: currentPrice }
    } else {
      const tgt = parseFloat(targetPrice)
      if (!tgt || tgt <= 0) { setMsg({ text: 'Enter a valid target price.', ok: false }); return }
      if (!closesAt) { setMsg({ text: 'Select a close date and time.', ok: false }); return }
      const closesAtUtc = new Date(closesAt).toISOString()
      if (new Date(closesAtUtc) <= new Date()) { setMsg({ text: 'Close date must be in the future.', ok: false }); return }
      body = { asset, market_type: marketType, target_price: tgt, closes_at: closesAtUtc }
    }

    setCreating(true); setMsg(null)
    const res = await fetch('/api/admin/create-updown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ text: 'Market created!', ok: true })
      setRecent(r => [{ id: data.marketId, title: data.title, closes_at: data.closes_at }, ...r])
      router.refresh()
    } else {
      setMsg({ text: data.error ?? 'Failed to create.', ok: false })
    }
    setCreating(false)
  }

  const selectedAsset = ASSETS.find(a => a.id === asset)!
  const currentPrice  = prices[asset]
  const tgtNum        = parseFloat(targetPrice) || 0

  function previewTitle() {
    const name = selectedAsset.name
    if (marketType === 'updown') {
      const w = WINDOWS.find(w => w.hours === window_h)?.label ?? `${window_h}h`
      return `Will ${name} be higher or lower in ${w}?`
    }
    const tgtStr  = tgtNum > 0 ? `$${tgtNum.toLocaleString()}` : '$[target]'
    const dateStr = closesAt
      ? new Date(closesAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
        + ' ' + new Date(closesAt).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
      : '[date]'
    return `Will ${name} close ${marketType === 'above' ? 'above' : 'below'} ${tgtStr} by ${dateStr}?`
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Crypto Price Markets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create Up/Down, price-above, and price-below markets for Bitcoin and Gold. All settle automatically at close.
        </p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create form */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-5">
          <h2 className="font-bold text-slate-200">Create new market</h2>

          {/* Market type */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Market Type</label>
            <div className="grid grid-cols-3 gap-2">
              {MARKET_TYPES.map(t => (
                <button key={t.id} onClick={() => setMarketType(t.id as MarketType)}
                  className={`rounded-xl border px-2 py-3 text-xs font-bold transition-all text-center leading-tight ${
                    marketType === t.id
                      ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                      : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-white'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Asset</label>
            <div className="grid grid-cols-2 gap-2">
              {ASSETS.map(a => (
                <button key={a.id} onClick={() => setAsset(a.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${asset !== a.id ? 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-white' : ''}`}
                  style={asset === a.id ? { borderColor: `${a.color}60`, background: `${a.color}12`, color: a.color } : {}}>
                  {a.sym} <span className="text-[10px] font-normal opacity-60">{a.name}</span>
                </button>
              ))}
            </div>
            {currentPrice && (
              <p className="mt-1.5 text-[11px] text-slate-600">
                Live: <span className="font-bold" style={{ color: selectedAsset.color }}>${currentPrice.toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Up/Down: window selector */}
          {marketType === 'updown' && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Prediction Window</label>
              <div className="grid grid-cols-4 gap-2">
                {WINDOWS.map(w => (
                  <button key={w.hours} onClick={() => setWindowH(w.hours)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                      window_h === w.hours
                        ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                        : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-white'
                    }`}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Above/Below: target price + close date */}
          {(marketType === 'above' || marketType === 'below') && (
            <>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Target Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    placeholder={currentPrice ? String(Math.round(currentPrice)) : '0'}
                    className="w-full rounded-xl border border-[#2a2a3e] bg-[#111118] pl-7 pr-4 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors"
                  />
                </div>
                {currentPrice && tgtNum > 0 && (
                  <p className="mt-1 text-[11px] text-slate-600">
                    {tgtNum > currentPrice ? '▲' : '▼'} {Math.abs(((tgtNum - currentPrice) / currentPrice) * 100).toFixed(1)}%
                    {tgtNum > currentPrice ? ' above' : ' below'} current price
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Close Date &amp; Time (local)</label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={e => setClosesAt(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  className="w-full rounded-xl border border-[#2a2a3e] bg-[#111118] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600 transition-colors [color-scheme:dark]"
                />
              </div>
            </>
          )}

          {/* Preview */}
          <div className="rounded-xl border border-[#2a2a3e] bg-[#111118] p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Preview</p>
            <p className="text-sm font-bold text-white leading-snug">{previewTitle()}</p>
            <div className="flex gap-2 mt-1">
              {marketType === 'updown' ? (
                <>
                  <span className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-400">▲ UP</span>
                  <span className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-1 text-xs font-bold text-red-400">▼ DOWN</span>
                </>
              ) : (
                <>
                  <span className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-400">✓ YES</span>
                  <span className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-1 text-xs font-bold text-red-400">✗ NO</span>
                </>
              )}
            </div>
          </div>

          <button onClick={create} disabled={creating || !currentPrice}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
            {creating ? 'Creating…' : 'Create Market'}
          </button>
        </div>

        {/* Recent */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <h2 className="font-bold text-slate-200">Recent Crypto Markets</h2>
          {recent.length === 0 && <p className="text-sm text-slate-600">None yet.</p>}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {recent.slice(0, 15).map(m => (
              <a key={m.id} href={`/markets/${m.id}`} target="_blank" rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-[#1e1e2e] px-4 py-3 hover:border-[#2a2a3e] transition-colors">
                <p className="text-sm font-semibold text-slate-300 leading-snug">{m.title}</p>
                <p className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">
                  {m.closes_at
                    ? new Date(m.closes_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                    : '—'}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
