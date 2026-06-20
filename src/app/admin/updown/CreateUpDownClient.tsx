'use client'
import { useEffect, useState } from 'react'

const ASSETS = [
  { id: 'bitcoin',     sym: 'BTC', name: 'Bitcoin',  color: '#f7931a' },
  { id: 'ethereum',    sym: 'ETH', name: 'Ethereum', color: '#627eea' },
  { id: 'solana',      sym: 'SOL', name: 'Solana',   color: '#9945ff' },
  { id: 'binancecoin', sym: 'BNB', name: 'BNB',      color: '#f3ba2f' },
  { id: 'ripple',      sym: 'XRP', name: 'XRP',      color: '#00aae4' },
]

const WINDOWS = [
  { label: '1 hour',   hours: 1  },
  { label: '4 hours',  hours: 4  },
  { label: '24 hours', hours: 24 },
]

type LivePrice = Record<string, number>

export default function CreateUpDownClient() {
  const [prices,    setPrices]    = useState<LivePrice>({})
  const [asset,     setAsset]     = useState('bitcoin')
  const [window_h,  setWindowH]   = useState(1)
  const [creating,  setCreating]  = useState(false)
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null)
  const [recent,    setRecent]    = useState<Array<{ id: string; title: string; closes_at: string }>>([])

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=usd')
      .then(r => r.json())
      .then(data => setPrices(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as { usd: number }).usd])))  )
      .catch(() => null)

    fetch('/api/admin/create-updown?list=true')
      .then(r => r.json())
      .then(d => setRecent(d.markets ?? []))
      .catch(() => null)
  }, [])

  async function create() {
    const price = prices[asset]
    if (!price) { setMsg({ text: 'Could not fetch current price. Try again.', ok: false }); return }
    setCreating(true); setMsg(null)
    const res = await fetch('/api/admin/create-updown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset, window_hours: window_h, entry_price: price }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg({ text: `Market created! ID: ${data.marketId}`, ok: true })
      setRecent(r => [{ id: data.marketId, title: data.title, closes_at: data.closes_at }, ...r])
    } else {
      setMsg({ text: data.error ?? 'Failed to create.', ok: false })
    }
    setCreating(false)
  }

  const selectedAsset = ASSETS.find(a => a.id === asset)
  const currentPrice  = prices[asset]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Up/Down Crypto Markets</h1>
        <p className="mt-1 text-sm text-slate-500">Create a binary UP/DOWN market pinned to the current live price. Resolves automatically at close.</p>
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

          {/* Asset */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Asset</label>
            <div className="grid grid-cols-3 gap-2">
              {ASSETS.map(a => (
                <button key={a.id} onClick={() => setAsset(a.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${asset === a.id ? `border-[${a.color}40] bg-[${a.color}10]` : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-white'}`}
                  style={asset === a.id ? { borderColor: `${a.color}60`, background: `${a.color}10`, color: a.color } : {}}>
                  {a.sym}
                </button>
              ))}
            </div>
          </div>

          {/* Window */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Prediction window</label>
            <div className="grid grid-cols-3 gap-2">
              {WINDOWS.map(w => (
                <button key={w.hours} onClick={() => setWindowH(w.hours)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${window_h === w.hours ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-white'}`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {selectedAsset && (
            <div className="rounded-xl border border-[#2a2a3e] bg-[#111118] p-4 space-y-1.5 text-sm">
              <p className="text-slate-600 text-xs uppercase tracking-wider font-bold">Preview</p>
              <p className="font-bold text-white">
                Will {selectedAsset.name} be higher or lower in {WINDOWS.find(w => w.hours === window_h)?.label}?
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">Entry price:</span>
                <span className="font-black" style={{ color: selectedAsset.color }}>
                  {currentPrice ? `$${currentPrice.toLocaleString()}` : 'fetching…'}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-400">▲ UP</span>
                <span className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-1 text-xs font-bold text-red-400">▼ DOWN</span>
              </div>
            </div>
          )}

          <button onClick={create} disabled={creating || !currentPrice}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
            {creating ? 'Creating…' : 'Create Up/Down Market'}
          </button>
        </div>

        {/* Recent */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <h2 className="font-bold text-slate-200">Recent Up/Down Markets</h2>
          {recent.length === 0 && <p className="text-sm text-slate-600">None yet.</p>}
          <div className="space-y-2">
            {recent.slice(0, 10).map(m => (
              <a key={m.id} href={`/markets/${m.id}`} target="_blank" rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-[#1e1e2e] px-4 py-3 hover:border-[#2a2a3e] transition-colors">
                <p className="text-sm font-semibold text-slate-300 leading-snug">{m.title}</p>
                <p className="text-[10px] text-slate-600 shrink-0">
                  {new Date(m.closes_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
