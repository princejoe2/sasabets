'use client'
import { useState, useEffect, useRef } from 'react'
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

const CAT_META: Record<string, { icon: string; color: string }> = {
  football:       { icon: '⚽', color: '#a3e635' },
  politics:       { icon: '🏛️', color: '#60a5fa' },
  economy:        { icon: '💰', color: '#fbbf24' },
  entertainment:  { icon: '🎵', color: '#f472b6' },
  tech:           { icon: '📱', color: '#22d3ee' },
  infrastructure: { icon: '🏗️', color: '#fb923c' },
  agriculture:    { icon: '🌿', color: '#34d399' },
  default:        { icon: '🔮', color: '#a78bfa' },
}

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

export interface EditMarket {
  id: string
  title: string
  description: string | null
  closes_at: string | null
  rake_pct: number
  options: Array<{ id: string; label: string; total_pool: number }>
  verification_type: string
  verification_config: Record<string, unknown>
  metadata: Record<string, unknown>
}

interface Props {
  onCreated: () => void
  prefill?: { title: string; optA: string; optB: string; conditionId?: string }
  editMarket?: EditMarket
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

// ── Image uploader ──────────────────────────────────────────────────────────
function ImageUploader({ label, preview, shape = 'square', onFile }: {
  label?: string
  preview: string | null
  shape?: 'square' | 'circle'
  onFile: (file: File, dataUrl: string) => void
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) onFile(file, ev.target.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>}
      <label className="cursor-pointer block">
        <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
        <div className="border-2 border-dashed border-[#2a2a3e] rounded-xl overflow-hidden transition-colors hover:border-violet-700/50">
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                className="w-full h-20 object-cover"
                style={{ borderRadius: 10 }}
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderRadius: 10 }}>
                <span className="text-white text-xs font-semibold">Click to change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className={`w-10 h-10 bg-[#1a1a28] flex items-center justify-center text-xl ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}`}>📷</div>
              <span className="text-xs font-semibold text-slate-500">Upload image</span>
              <span className="text-[10px] text-slate-600">PNG · JPG · WebP · max 5 MB</span>
            </div>
          )}
        </div>
      </label>
    </div>
  )
}

// ── Card preview ────────────────────────────────────────────────────────────
function CardPreview({ title, category, marketType, party1Preview, team1Preview, team1Name, team2Preview, team2Name, optA, optB, closesAt }: {
  title: string; category: string; marketType: 'single' | 'dual'
  party1Preview: string | null
  team1Preview: string | null; team1Name: string
  team2Preview: string | null; team2Name: string
  optA: string; optB: string; closesAt: string
}) {
  const cat    = CAT_META[category] ?? CAT_META.default
  const catDef = MANUAL_CATS.find(c => c.id === category)
  const isVs   = marketType === 'dual'

  let borderColor = '#1e1e2e'
  let urgencyLabel = ''
  if (closesAt) {
    const diff  = new Date(closesAt).getTime() - Date.now()
    const hours = diff / 3_600_000
    if (diff < 0)       { borderColor = '#1e1e2e';                     urgencyLabel = 'Closed' }
    else if (hours < 1) { borderColor = 'rgba(239,68,68,0.65)';        urgencyLabel = 'FINAL MINUTES' }
    else if (hours < 6) { borderColor = 'rgba(249,115,22,0.55)';       urgencyLabel = 'ENDS SOON' }
    else if (hours < 24){ borderColor = 'rgba(249,115,22,0.3)'; }
  }

  function timeLabel() {
    if (!closesAt) return null
    const diff = new Date(closesAt).getTime() - Date.now()
    if (diff <= 0) return 'Closed'
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    if (h >= 48) return `${Math.floor(h / 24)}d`
    if (h >= 1)  return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#13131a', border: `1.5px solid ${borderColor}` }}>
      {urgencyLabel && urgencyLabel !== 'Closed' && (
        <div className="text-center py-1.5 text-[10px] font-black uppercase tracking-wider"
          style={{ color: '#fb923c', background: 'rgba(249,115,22,0.1)', borderBottom: '1px solid rgba(249,115,22,0.2)' }}>
          ⏰ {urgencyLabel}
        </div>
      )}
      <div className="p-4">
        {isVs ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: cat.color }}>
                {cat.icon} {catDef?.label ?? 'Other'}
              </span>
              {closesAt && (
                <span className="text-[10px] text-slate-600">
                  {new Date(closesAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            <div className="flex items-center justify-around mb-3">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                {team1Preview
                  ? <img src={team1Preview} className="w-14 h-14 rounded-full object-cover" style={{ border: `2px solid ${cat.color}40` }} />
                  : <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#1a1a28', border: '2px solid #2a2a3e' }}>🏆</div>
                }
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate max-w-[76px] text-center">{team1Name || 'Team A'}</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>—</span>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-slate-600 flex-shrink-0" style={{ background: '#1e1e2e' }}>vs</div>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                {team2Preview
                  ? <img src={team2Preview} className="w-14 h-14 rounded-full object-cover" style={{ border: `2px solid ${cat.color}40` }} />
                  : <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#1a1a28', border: '2px solid #2a2a3e' }}>🏆</div>
                }
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate max-w-[76px] text-center">{team2Name || 'Team B'}</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24' }}>—</span>
              </div>
            </div>
            {title && <h3 className="text-[12px] font-bold leading-snug text-slate-300 line-clamp-2 mb-3">{title}</h3>}
          </>
        ) : (
          <>
            <div className="flex gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative overflow-hidden"
                style={{ background: `${cat.color}14`, border: `1.5px solid ${cat.color}28` }}>
                {party1Preview
                  ? <img src={party1Preview} className="w-full h-full object-cover" />
                  : <span>{cat.icon}</span>
                }
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#13131a]" />
              </div>
              <h3 className="text-[13px] font-bold leading-snug flex-1 mt-0.5" style={{ color: title ? '#f1f5f9' : '#475569' }}>
                {title || 'Your question will appear here…'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
                style={{ background: `${cat.color}14`, color: cat.color, border: `1px solid ${cat.color}28` }}>
                {cat.icon} {catDef?.label ?? 'Other'}
              </span>
              {timeLabel() && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-500" style={{ background: '#1e1e2e' }}>
                  ⏱ {timeLabel()}
                </span>
              )}
            </div>
          </>
        )}

        {/* Probability bar placeholder */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span style={{ color: '#a78bfa' }}>—%</span>
            <span style={{ color: '#fbbf24' }}>—%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: '#1a1a2e' }}>
            <div className="h-full w-1/2" style={{ background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
            <div className="h-full flex-1"  style={{ background: 'linear-gradient(90deg,#b45309,#fbbf24)' }} />
          </div>
        </div>

        {/* Bet buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl py-2.5 px-3 text-xs font-bold text-center truncate"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1.5px solid rgba(167,139,250,0.28)', color: '#a78bfa' }}>
            {optA || (isVs ? (team1Name || 'Team A') : 'Side A')}
          </div>
          <div className="rounded-xl py-2.5 px-3 text-xs font-bold text-center truncate"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1.5px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}>
            {optB || (isVs ? (team2Name || 'Team B') : 'Side B')}
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #1e1e2e' }}>
          <span className="text-[11px] font-medium text-slate-600">UGX <span className="text-slate-500 font-bold">0</span></span>
          <span className="text-xs font-black" style={{ color: cat.color }}>Predict →</span>
        </div>
      </div>
    </div>
  )
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

function initVerFields(verType: string, cfg: Record<string, unknown>) {
  return {
    verAsset:     (cfg.asset     as string)               || 'bitcoin',
    verThreshold: (cfg.threshold as number)?.toString()   || '',
    verOptAWins:  (cfg.optAWinsWhen as 'above'|'below')   || 'above',
    verPair:      (cfg.pair      as string)               || 'ugx',
    verCondId:    (cfg.conditionId as string)             || '',
    fbEventId:    (cfg.eventId   as string)               || '',
    fbEventName:  (cfg.eventName as string)               || '',
    optAOutcome:  (cfg.optAOutcome as 'home_win'|'away_win'|'draw') || 'home_win',
  }
}

// ── Main form ───────────────────────────────────────────────────────────────
export default function CreateMarketForm({ onCreated, prefill, editMarket }: Props) {
  const router  = useRouter()
  const isEdit  = !!editMarket

  // Derive initial values from editMarket or prefill
  const initTitle   = editMarket?.title       ?? prefill?.title ?? ''
  const initOptA    = editMarket?.options[0]?.label ?? prefill?.optA ?? ''
  const initOptB    = editMarket?.options[1]?.label ?? prefill?.optB ?? ''
  const initDesc    = editMarket?.description ?? ''
  const initCloses  = isoToDatetimeLocal(editMarket?.closes_at ?? null)
  const initMeta    = editMarket?.metadata ?? {}
  const initVerType = (editMarket?.verification_type as VerificationType) ?? 'manual'
  const initVerCfg  = editMarket?.verification_config ?? {}
  const initVerF    = initVerFields(initVerType, initVerCfg)
  const initCat     = (initMeta.category as string) ?? autoDetectCat(initTitle)
  const initMType   = (initMeta.team1Image || initMeta.team2Image) ? 'dual' : 'single'
  const initT1Name  = initMType === 'dual' ? initOptA : ''
  const initT2Name  = initMType === 'dual' ? initOptB : ''

  // Core fields
  const [title,       setTitle]       = useState(initTitle)
  const [description, setDescription] = useState(initDesc)
  const [closesAt,    setClosesAt]    = useState(initCloses)
  const [optA,        setOptA]        = useState(initOptA)
  const [optB,        setOptB]        = useState(initOptB)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Category
  const [category,  setCategory]  = useState(initCat)
  const [catManual, setCatManual] = useState(isEdit)

  // Market type + images
  const [marketType,     setMarketType]     = useState<'single' | 'dual'>(initMType as 'single' | 'dual')
  const [party1File,     setParty1File]     = useState<File | null>(null)
  const [party1Preview,  setParty1Preview]  = useState<string | null>(null)
  const [team1File,      setTeam1File]      = useState<File | null>(null)
  const [team1Preview,   setTeam1Preview]   = useState<string | null>(null)
  const [team1Name,      setTeam1Name]      = useState(initT1Name)
  const [team2File,      setTeam2File]      = useState<File | null>(null)
  const [team2Preview,   setTeam2Preview]   = useState<string | null>(null)
  const [team2Name,      setTeam2Name]      = useState(initT2Name)
  // Existing image URLs from metadata (shown until replaced by a new upload)
  const [existingPartyUrl, setExistingPartyUrl] = useState<string | null>((initMeta.partyImage as string) ?? null)
  const [existingTeam1Url, setExistingTeam1Url] = useState<string | null>((initMeta.team1Image as string) ?? null)
  const [existingTeam2Url, setExistingTeam2Url] = useState<string | null>((initMeta.team2Image as string) ?? null)
  const titleManual = useRef(isEdit || !!prefill?.title)

  // Verification
  const [showVer,      setShowVer]      = useState(isEdit && initVerType !== 'manual')
  const [verType,      setVerType]      = useState<VerificationType>(initVerType)
  const [verAsset,     setVerAsset]     = useState(initVerF.verAsset)
  const [verThreshold, setVerThreshold] = useState(initVerF.verThreshold)
  const [verOptAWins,  setVerOptAWins]  = useState<'above' | 'below'>(initVerF.verOptAWins)
  const [verPair,      setVerPair]      = useState(initVerF.verPair)
  const [verCondId,    setVerCondId]    = useState(initVerF.verCondId || (prefill?.conditionId ?? ''))
  const [fbQuery,      setFbQuery]      = useState('')
  const [fbResults,    setFbResults]    = useState<FootballEvent[]>([])
  const [fbLoading,    setFbLoading]    = useState(false)
  const [fbEvent,      setFbEvent]      = useState<FootballEvent | null>(
    initVerF.fbEventId ? { id: initVerF.fbEventId, name: initVerF.fbEventName, homeTeam: '', awayTeam: '', league: '', date: '', time: '', status: '' } : null
  )
  const [optAOutcome,  setOptAOutcome]  = useState<'home_win' | 'away_win' | 'draw'>(initVerF.optAOutcome)

  // Sync prefill (only in create mode)
  useEffect(() => {
    if (isEdit || !prefill) return
    setTitle(prefill.title); setOptA(prefill.optA); setOptB(prefill.optB); setError('')
    titleManual.current = true
    if (!catManual) setCategory(autoDetectCat(prefill.title))
    if (prefill.conditionId) { setVerCondId(prefill.conditionId); setVerType('polymarket'); setShowVer(true) }
  }, [prefill?.title, prefill?.optA, prefill?.optB, prefill?.conditionId])

  // Auto-detect category from title
  useEffect(() => { if (!catManual) setCategory(autoDetectCat(title)) }, [title])

  // In dual mode: auto-populate optA/optB from team names
  useEffect(() => {
    if (marketType !== 'dual') return
    if (team1Name) setOptA(team1Name)
    if (team2Name) setOptB(team2Name)
    if (team1Name && team2Name && !titleManual.current) setTitle(`${team1Name} vs ${team2Name}`)
  }, [marketType, team1Name, team2Name])

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      return (data.url as string) || null
    } catch { return null }
  }

  async function searchFootball() {
    if (!fbQuery.trim()) return
    setFbLoading(true); setFbResults([])
    try {
      const res  = await fetch(`/api/admin/football-search?q=${encodeURIComponent(fbQuery)}`)
      const data = await res.json()
      setFbResults(Array.isArray(data) ? data : [])
    } catch { setFbResults([]) }
    setFbLoading(false)
  }

  function buildVerificationConfig() {
    switch (verType) {
      case 'crypto_price': return { asset: verAsset, threshold: parseFloat(verThreshold) || 0, optAWinsWhen: verOptAWins }
      case 'fx_rate':      return { pair: verPair, threshold: parseFloat(verThreshold) || 0, optAWinsWhen: verOptAWins }
      case 'polymarket':   return { conditionId: verCondId }
      case 'football':     return { eventId: fbEvent?.id ?? '', eventName: fbEvent?.name ?? '', optAOutcome }
      default:             return {}
    }
  }

  async function handleSubmit() {
    if (!title.trim())                { setError('Title is required'); return }
    if (!optA.trim() || !optB.trim()) { setError('Both sides are required'); return }
    if (optA.trim().toLowerCase() === optB.trim().toLowerCase()) { setError('The two sides must be different'); return }
    if (verType === 'crypto_price' && !verThreshold) { setError('Enter a price threshold'); return }
    if (verType === 'fx_rate'      && !verThreshold) { setError('Enter a rate threshold');  return }
    if (verType === 'polymarket'   && !verCondId)    { setError('Polymarket condition ID is required'); return }
    if (verType === 'football'     && !fbEvent)      { setError('Select a football match'); return }

    setLoading(true); setError('')

    // Upload only new files; keep existing URLs for unchanged images
    const [uploadedParty, uploadedTeam1, uploadedTeam2] = await Promise.all([
      party1File ? uploadImage(party1File) : Promise.resolve(null),
      team1File  ? uploadImage(team1File)  : Promise.resolve(null),
      team2File  ? uploadImage(team2File)  : Promise.resolve(null),
    ])

    const partyImage = uploadedParty ?? existingPartyUrl ?? null
    const team1Image = uploadedTeam1 ?? existingTeam1Url ?? null
    const team2Image = uploadedTeam2 ?? existingTeam2Url ?? null

    if (isEdit) {
      const res = await fetch(`/api/admin/market/${editMarket!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:              title.trim(),
          description:        description.trim() || null,
          closesAt:           closesAt || null,
          optALabel:          optA.trim(),
          optBLabel:          optB.trim(),
          verificationType:   verType,
          verificationConfig: buildVerificationConfig(),
          category,
          partyImage,
          team1Image,
          team2Image,
        }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to save market')
      else { onCreated(); router.refresh() }
    } else {
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
          partyImage,
          team1Image,
          team2Image,
        }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to create market')
      else { onCreated(); router.refresh() }
    }
    setLoading(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-8 items-start">

      {/* ── Form column ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Market type toggle */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Market Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(['single', 'dual'] as const).map(type => {
              const active = marketType === type
              const label  = type === 'single' ? '🎯 Single Party' : '⚔️ Two Parties (vs)'
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMarketType(type)}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                    active
                      ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                      : 'border-[#1e1e2e] text-slate-500 hover:border-[#2a2a3e] hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Image uploads — single party */}
        {marketType === 'single' && (
          <ImageUploader
            label="Party Image (optional)"
            preview={party1Preview ?? existingPartyUrl}
            shape="square"
            onFile={(file, dataUrl) => { setParty1File(file); setParty1Preview(dataUrl) }}
          />
        )}

        {/* Image uploads — dual party */}
        {marketType === 'dual' && (
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Team / Party Logos</label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <div className="space-y-2">
                <ImageUploader
                  preview={team1Preview ?? existingTeam1Url}
                  shape="circle"
                  onFile={(file, dataUrl) => { setTeam1File(file); setTeam1Preview(dataUrl) }}
                />
                <input
                  value={team1Name} onChange={e => setTeam1Name(e.target.value)}
                  placeholder="Team / party name"
                  className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-3 py-2 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2a2a3e] bg-[#13131a] text-xs font-black text-slate-500">VS</div>

              <div className="space-y-2">
                <ImageUploader
                  preview={team2Preview ?? existingTeam2Url}
                  shape="circle"
                  onFile={(file, dataUrl) => { setTeam2File(file); setTeam2Preview(dataUrl) }}
                />
                <input
                  value={team2Name} onChange={e => setTeam2Name(e.target.value)}
                  placeholder="Team / party name"
                  className="w-full rounded-xl border border-amber-900/40 bg-[#0d0d14] px-3 py-2 text-sm font-semibold text-amber-200 outline-none focus:border-amber-600 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Question / Title
            {marketType === 'dual' && team1Name && team2Name && (
              <span className="ml-2 normal-case font-normal text-slate-600">auto-suggested from team names</span>
            )}
          </label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); titleManual.current = true }}
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
                <button key={c.id} type="button"
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
              <button type="button"
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

        {/* Two sides — in dual mode these are derived from team names */}
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {marketType === 'dual' ? 'Outcome Labels' : 'The Two Sides'}
            {marketType === 'dual' && <span className="ml-2 normal-case font-normal text-slate-600">auto-filled from team names above</span>}
          </label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-violet-500">Side A</div>
              <input value={optA} onChange={e => setOptA(e.target.value)}
                placeholder={marketType === 'dual' ? 'Team 1 name' : 'e.g. Yes / Uganda / KCCA FC'}
                className="w-full rounded-xl border border-violet-900/40 bg-[#0d0d14] px-4 py-3 text-sm font-semibold text-violet-200 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
              />
            </div>
            <div className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2a2a3e] bg-[#13131a] text-xs font-black text-slate-500">VS</div>
            <div>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">Side B</div>
              <input value={optB} onChange={e => setOptB(e.target.value)}
                placeholder={marketType === 'dual' ? 'Team 2 name' : 'e.g. No / Kenya / Express FC'}
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

        {/* Auto-verification */}
        <div className="rounded-xl border border-[#1e1e2e] overflow-hidden">
          <button type="button" onClick={() => setShowVer(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#0d0d14] transition-colors">
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
              <p className="text-[11px] text-slate-600">Choose how this market gets settled. Markets with a verifiable API source can settle automatically when they close.</p>

              <div className="grid grid-cols-5 gap-1.5">
                {VER_TYPES.map(vt => (
                  <button key={vt.id} type="button" onClick={() => setVerType(vt.id)}
                    className={`rounded-lg border py-2 text-center text-xs font-bold transition-colors ${
                      verType === vt.id
                        ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                        : 'border-[#1e1e2e] text-slate-500 hover:border-[#2a2a3e] hover:text-slate-300'
                    }`}>
                    <div className="text-base">{vt.icon}</div>
                    <div>{vt.label}</div>
                  </button>
                ))}
              </div>

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

              {verType === 'polymarket' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Polymarket Condition ID</label>
                    <input value={verCondId} onChange={e => setVerCondId(e.target.value)}
                      placeholder="0x1234…abcd"
                      className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-2.5 font-mono text-xs text-white outline-none focus:border-violet-600"
                    />
                  </div>
                  {verCondId
                    ? <p className="text-[11px] text-slate-500">This market will auto-settle when the Polymarket market resolves. Side A maps to outcome[0], Side B to outcome[1].</p>
                    : <p className="text-[11px] text-slate-600">Import a market from Polymarket above to auto-fill this field.</p>
                  }
                </div>
              )}

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
          {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes →' : 'Create Market →')}
        </button>
      </div>

      {/* ── Live preview column ── */}
      <div className="hidden xl:block w-[272px] flex-shrink-0 sticky top-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Live Preview</p>
        <CardPreview
          title={title}
          category={category}
          marketType={marketType}
          party1Preview={party1Preview ?? existingPartyUrl}
          team1Preview={team1Preview ?? existingTeam1Url}
          team1Name={team1Name}
          team2Preview={team2Preview ?? existingTeam2Url}
          team2Name={team2Name}
          optA={optA}
          optB={optB}
          closesAt={closesAt}
        />
        <p className="mt-3 text-[10px] text-slate-700 leading-relaxed">
          Odds and pool shown after first bets are placed. Image uploaded to storage on submit.
        </p>
      </div>

    </div>
  )
}
