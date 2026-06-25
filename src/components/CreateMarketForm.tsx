'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { VerificationType } from '@/lib/auto-verify'

const MANUAL_CATS = [
  { id: 'football',       icon: '⚽', label: 'Football'       },
  { id: 'politics',       icon: '🏛️', label: 'Politics'       },
  { id: 'economy',        icon: '💰', label: 'Economy'        },
  { id: 'entertainment',  icon: '🎵', label: 'Entertainment'  },
  { id: 'tech',           icon: '📱', label: 'Technology'     },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructure' },
  { id: 'agriculture',    icon: '🌿', label: 'Agriculture'    },
  { id: 'default',        icon: '✨', label: 'Other'          },
]

function autoDetectCat(title: string): string {
  const t = title.toLowerCase()
  if (/football|soccer|fufa|kcca|vipers|express.?fc|cranes|afcon|world.?cup/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|vote|nup|nrm|minister/.test(t)) return 'politics'
  if (/oil|exchange.?rate|ugx|usd|bitcoin|btc|crypto|gdp|shilling|economy|coffee|robusta|bank|profit/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|chameleone|fik.?fameica|pallaso/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel|mtn|telecom|subscribers/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road|bridge|kampala.*jinja|construction/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|harvest|maize/.test(t)) return 'agriculture'
  return 'default'
}

interface Props {
  onCreated: () => void
  prefill?: { title: string; optA: string; optB: string; conditionId?: string }
}

interface FootballEvent {
  id: string; name: string; homeTeam: string; awayTeam: string
  league: string; date: string; time: string; status: string
}

const CRYPTO_ASSETS = [
  { id: 'bitcoin',  label: 'BTC / Bitcoin' },
  { id: 'ethereum', label: 'ETH / Ethereum' },
  { id: 'solana',   label: 'SOL / Solana' },
]

const FX_PAIRS = [
  { id: 'ugx', label: 'UGX / Ugandan Shilling' },
  { id: 'kes', label: 'KES / Kenyan Shilling' },
  { id: 'tzs', label: 'TZS / Tanzanian Shilling' },
]

const VER_TYPES: { id: VerificationType; label: string; icon: string }[] = [
  { id: 'manual',       label: 'Manual',     icon: '👤' },
  { id: 'crypto_price', label: 'Crypto',     icon: '₿'  },
  { id: 'fx_rate',      label: 'FX Rate',    icon: '💱' },
  { id: 'polymarket',   label: 'Polymarket', icon: '🌐' },
  { id: 'football',     label: 'Football',   icon: '⚽' },
]

export default function CreateMarketForm({ onCreated, prefill }: Props) {
  const router = useRouter()

  // Core fields
  const [title,       setTitle]       = useState(prefill?.title ?? '')
  const [description, setDescription] = useState('')
  const [closesAt,    setClosesAt]    = useState('')
  const [optA,        setOptA]        = useState(prefill?.optA ?? '')
  const [optB,        setOptB]        = useState(prefill?.optB ?? '')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Category
  const [category,   setCategory]   = useState(autoDetectCat(prefill?.title ?? ''))
  const [catManual,  setCatManual]  = useState(false)

  // Verification
  const [showVer,      setShowVer]      = useState(false)
  const [verType,      setVerType]      = useState<VerificationType>('manual')
  // crypto
  const [verAsset,     setVerAsset]     = useState('bitcoin')
  const [verThreshold, setVerThreshold] = useState('')
  const [verOptAWins,  setVerOptAWins]  = useState<'above' | 'below'>('above')
  // fx
  const [verPair,      setVerPair]      = useState('ugx')
  // polymarket
  const [verCondId,    setVerCondId]    = useState(prefill?.conditionId ?? '')
  // football
  const [fbQuery,      setFbQuery]      = useState('')
  const [fbResults,    setFbResults]    = useState<FootballEvent[]>([])
  const [fbLoading,    setFbLoading]    = useState(false)
  const [fbEvent,      setFbEvent]      = useState<FootballEvent | null>(null)
  const [optAOutcome,  setOptAOutcome]  = useState<'home_win' | 'away_win' | 'draw'>('home_win')

  useEffect(() => {
    if (prefill) {
      setTitle(prefill.title)
      setOptA(prefill.optA)
      setOptB(prefill.optB)
      setError('')
      if (!catManual) setCategory(autoDetectCat(prefill.title))
      if (prefill.conditionId) {
        setVerCondId(prefill.conditionId)
        setVerType('polymarket')
        setShowVer(true)
      }
    }
  }, [prefill?.title, prefill?.optA, prefill?.optB, prefill?.conditionId])

  // Auto-detect category from title as admin types (only when not manually set)
  useEffect(() => {
    if (!catManual) setCategory(autoDetectCat(title))
  }, [title])

  async function searchFootball() {
    if (!fbQuery.trim()) return
    setFbLoading(true)
    setFbResults([])
    try {
      const res  = await fetch(`/api/admin/football-search?q=${encodeURIComponent(fbQuery)}`)
      const data = await res.json()
      setFbResults(Array.isArray(data) ? data : [])
    } catch { setFbResults([]) }
    setFbLoading(false)
  }

  function buildVerificationConfig() {
    switch (verType) {
      case 'crypto_price':
        return { asset: verAsset, threshold: parseFloat(verThreshold) || 0, optAWinsWhen: verOptAWins }
      case 'fx_rate':
        return { pair: verPair, threshold: parseFloat(verThreshold) || 0, optAWinsWhen: verOptAWins }
      case 'polymarket':
        return { conditionId: verCondId }
      case 'football':
        return { eventId: fbEvent?.id ?? '', eventName: fbEvent?.name ?? '', optAOutcome }
      default:
        return {}
    }
  }

  async function handleSubmit() {
    if (!title.trim())                { setError('Title is required'); return }
    if (!optA.trim() || !optB.trim()) { setError('Both sides are required'); return }
    if (optA.trim().toLowerCase() === optB.trim().toLowerCase()) {
      setError('The two sides must be different'); return
    }
    if (verType === 'crypto_price' && !verThreshold) { setError('Enter a price threshold'); return }
    if (verType === 'fx_rate'      && !verThreshold) { setError('Enter a rate threshold');  return }
    if (verType === 'polymarket'   && !verCondId)    { setError('Polymarket condition ID is required'); return }
    if (verType === 'football'     && !fbEvent)      { setError('Select a football match'); return }

    setLoading(true); setError('')

    const res = await fetch('/api/admin/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        closesAt: closesAt || null,
        options: [
          { id: 'opt_a', label: optA.trim(), total_pool: 0 },
          { id: 'opt_b', label: optB.trim(), total_pool: 0 },
        ],
        verificationType:   verType,
        verificationConfig: buildVerificationConfig(),
        category,
      }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed to create market')
    else { onCreated(); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Question / Title</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Will Uganda qualify for AFCON 2026?"
          className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Category
          {!catManual && title.trim() && (
            <span className="ml-2 normal-case font-normal text-slate-600">auto-detected · click to override</span>
          )}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MANUAL_CATS.map(c => {
            const active = category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCategory(c.id); setCatManual(true) }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                    : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                }`}
              >
                {c.icon} {c.label}
              </button>
            )
          })}
          {catManual && (
            <button
              type="button"
              onClick={() => { setCatManual(false); setCategory(autoDetectCat(title)) }}
              className="rounded-full border border-dashed border-[#2a2a3e] px-3 py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              ↺ auto
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Description <span className="normal-case font-normal text-slate-600">(optional)</span>
        </label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="Add context about the market, sources, or settlement criteria…"
          className="w-full resize-none rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors"
        />
      </div>

      {/* Binary sides */}
      <div>
        <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">The Two Sides</label>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-violet-500">Side A</div>
            <input value={optA} onChange={e => setOptA(e.target.value)} placeholder="e.g. Yes / Uganda / KCCA FC"
              className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-4 py-3 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
            />
          </div>
          <div className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2a2a3e] bg-[#13131a] text-xs font-black text-slate-500">VS</div>
          <div>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">Side B</div>
            <input value={optB} onChange={e => setOptB(e.target.value)} placeholder="e.g. No / Kenya / Express FC"
              className="w-full rounded-xl border border-amber-900/40 bg-[#0d0d14] px-4 py-3 text-sm font-semibold text-amber-200 outline-none focus:border-amber-600 transition-colors placeholder:text-slate-600"
            />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">All markets are binary — exactly two sides.</p>
      </div>

      {/* Closes at */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Closes at <span className="normal-case font-normal text-slate-600">(optional)</span>
        </label>
        <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}
          className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors"
        />
      </div>

      {/* ── Auto-verification ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVer(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#0d0d14] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">⚡</span>
            <span className="text-sm font-bold text-slate-300">Auto-verification</span>
            {verType !== 'manual' && (
              <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/40">
                {VER_TYPES.find(v => v.id === verType)?.icon} {VER_TYPES.find(v => v.id === verType)?.label}
              </span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{showVer ? '▲' : '▼'}</span>
        </button>

        {showVer && (
          <div className="border-t border-[#1e1e2e] bg-[#0a0a0f] p-4 space-y-4">
            <p className="text-[11px] text-slate-600">
              Choose how this market gets settled. Markets with a verifiable API source can settle automatically when they close.
            </p>

            {/* Type selector */}
            <div className="grid grid-cols-5 gap-1.5">
              {VER_TYPES.map(vt => (
                <button
                  key={vt.id} type="button"
                  onClick={() => setVerType(vt.id)}
                  className={`rounded-lg border py-2 text-center text-xs font-bold transition-colors ${
                    verType === vt.id
                      ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                      : 'border-[#1e1e2e] text-slate-500 hover:border-[#2a2a3e] hover:text-slate-300'
                  }`}
                >
                  <div className="text-base">{vt.icon}</div>
                  <div>{vt.label}</div>
                </button>
              ))}
            </div>

            {/* Crypto price config */}
            {verType === 'crypto_price' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Asset</label>
                  <select value={verAsset} onChange={e => setVerAsset(e.target.value)}
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600">
                    {CRYPTO_ASSETS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Side A wins when price is</label>
                    <select value={verOptAWins} onChange={e => setVerOptAWins(e.target.value as 'above' | 'below')}
                      className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-4 py-2.5 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500">
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                  <span className="pb-2.5 text-slate-600 text-sm">$</span>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Threshold (USD)</label>
                    <input type="number" value={verThreshold} onChange={e => setVerThreshold(e.target.value)}
                      placeholder="100000"
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600"
                    />
                  </div>
                </div>
                {verThreshold && (
                  <p className="text-[11px] text-slate-500">
                    Side A (<span className="text-violet-400">{optA || 'opt_a'}</span>) wins if {verAsset} price is {verOptAWins} ${parseFloat(verThreshold).toLocaleString()} USD at close time.
                    Side B (<span className="text-amber-400">{optB || 'opt_b'}</span>) wins otherwise.
                  </p>
                )}
              </div>
            )}

            {/* FX rate config */}
            {verType === 'fx_rate' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Currency pair</label>
                  <select value={verPair} onChange={e => setVerPair(e.target.value)}
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600">
                    {FX_PAIRS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Side A wins when rate is</label>
                    <select value={verOptAWins} onChange={e => setVerOptAWins(e.target.value as 'above' | 'below')}
                      className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-4 py-2.5 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500">
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Threshold (per $1 USD)</label>
                    <input type="number" value={verThreshold} onChange={e => setVerThreshold(e.target.value)}
                      placeholder={verPair === 'ugx' ? '3700' : verPair === 'kes' ? '130' : '2500'}
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600"
                    />
                  </div>
                </div>
                {verThreshold && (
                  <p className="text-[11px] text-slate-500">
                    Side A wins if {verPair.toUpperCase()}/USD is {verOptAWins} {parseFloat(verThreshold).toLocaleString()} at close time.
                  </p>
                )}
              </div>
            )}

            {/* Polymarket config */}
            {verType === 'polymarket' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Polymarket Condition ID</label>
                  <input value={verCondId} onChange={e => setVerCondId(e.target.value)}
                    placeholder="0x1234…abcd"
                    className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 font-mono text-xs text-white outline-none focus:border-violet-600"
                  />
                </div>
                {verCondId ? (
                  <p className="text-[11px] text-slate-500">
                    This market will auto-settle when the Polymarket market resolves. Side A maps to outcome[0], Side B to outcome[1].
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600">Import a market from Polymarket above to auto-fill this field.</p>
                )}
              </div>
            )}

            {/* Football config */}
            {verType === 'football' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Search for match (TheSportsDB)</label>
                  <div className="flex gap-2">
                    <input
                      value={fbQuery} onChange={e => setFbQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchFootball()}
                      placeholder="e.g. Uganda vs Kenya, KCCA, AFCON…"
                      className="flex-1 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-600"
                    />
                    <button type="button" onClick={searchFootball} disabled={fbLoading}
                      className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold hover:bg-violet-600 disabled:opacity-50 transition-colors">
                      {fbLoading ? '…' : '⚽'}
                    </button>
                  </div>
                </div>

                {fbResults.length > 0 && !fbEvent && (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-2">
                    {fbResults.map(ev => (
                      <button key={ev.id} type="button" onClick={() => { setFbEvent(ev); setFbResults([]) }}
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-[#1e1e2e] transition-colors">
                        <p className="text-sm font-semibold text-slate-200">{ev.name}</p>
                        <p className="text-[10px] text-slate-600">{ev.league} · {ev.date} · {ev.status || 'Upcoming'}</p>
                      </button>
                    ))}
                  </div>
                )}

                {fbEvent && (
                  <div className="space-y-3 rounded-xl border border-emerald-800/30 bg-[#0a1309] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-emerald-400">{fbEvent.name}</p>
                        <p className="text-[10px] text-slate-600">{fbEvent.league} · {fbEvent.date}</p>
                      </div>
                      <button type="button" onClick={() => setFbEvent(null)} className="text-xs text-slate-600 hover:text-slate-400">✕</button>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Side A (<span className="text-violet-400">{optA || 'opt_a'}</span>) wins when
                      </label>
                      <select value={optAOutcome} onChange={e => setOptAOutcome(e.target.value as typeof optAOutcome)}
                        className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-4 py-2.5 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500">
                        <option value="home_win">{fbEvent.homeTeam} wins (Home)</option>
                        <option value="away_win">{fbEvent.awayTeam} wins (Away)</option>
                        <option value="draw">Draw</option>
                      </select>
                      <p className="mt-1.5 text-[10px] text-slate-600">
                        Side B (<span className="text-amber-400">{optB || 'opt_b'}</span>) wins in all other outcomes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
        {loading ? 'Creating…' : 'Create Market'}
      </button>
    </div>
  )
}
