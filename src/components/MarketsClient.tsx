'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWatchlist } from '@/hooks/useWatchlist'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ──────────────────────────────────────────────────── */
type Mkt = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: Array<{ id: string; label: string; total_pool: number }>
  closes_at: string | null
  created_at: string
  status: string
  rake_pct: number
  metadata?: Record<string, unknown>
  is_featured?: boolean
}

type Category = 'all' | 'updown' | 'football' | 'politics' | 'economy' | 'entertainment' | 'tech' | 'infrastructure' | 'agriculture' | 'default'
type Sort     = 'random' | 'pool' | 'closing' | 'newest'

/* ─── Category detection ─────────────────────────────────────── */
const VALID_CATS: Category[] = ['football','politics','economy','entertainment','tech','infrastructure','agriculture','updown','default']

function detectCat(title: string, desc = '', metadata?: Record<string, unknown>): Exclude<Category, 'all'> {
  if (metadata?.type === 'updown' || metadata?.type === 'price_level') return 'updown'
  const stored = metadata?.category as string | undefined
  if (stored && VALID_CATS.includes(stored as Category)) return stored as Exclude<Category, 'all'>
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|premier.?league|fufa|kcca.*fc|vipers|express.?fc|cranes|afcon|scorer|derby|sc.villa|bul.fc|world.?cup|golden.?boot|messi|haaland|mbapp|bellingham|ronaldo|england.*group|group.?l|norway.*wc|wc.*final|africa.*semi|wc.*semi/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|social.?media.?tax|vote|contest|treason|muhoozi|lukwago|speaker|nabbanja|minister|mp.be|nup.mp|vetting|ayebare|oboth|foreign.?affair/.test(t)) return 'politics'
  if (/oil.?production|exchange.?rate|ugx.*usd|usd.*ugx|bank.*branch|share.?price|startup.?fund|largest.?fund|mtn.?uganda.?(share|profit|report)|robusta|farmgate|coffee|bitcoin|btc|crypto|gdp|shilling|profit|economy|eacop|pipeline|dividend|inflation/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|eddy.?kenzo|chameleone|fik.?fameica|pallaso|winnie.?nwagi|headline|ai.?product|openai|google.?deep|concert/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel.?money|mtn.?momo|telecom|users.?in.?uganda|startup|digital.?currency|cbdc/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road.?repair|kampala.*jinja|infrastructure/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|long.?rains/.test(t)) return 'agriculture'
  return 'default'
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = seed | 1
  const rand = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296 }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/* ─── Category config (no emoji — clean text only) ──────────── */
const CATS: { id: Category; label: string }[] = [
  { id: 'all',            label: 'All'            },
  { id: 'updown',         label: 'Up/Down'        },
  { id: 'football',       label: 'Football'       },
  { id: 'politics',       label: 'Politics'       },
  { id: 'economy',        label: 'Economy'        },
  { id: 'entertainment',  label: 'Entertainment'  },
  { id: 'tech',           label: 'Technology'     },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'agriculture',    label: 'Agriculture'    },
  { id: 'default',        label: 'Other'          },
]

/* neutral dark avatar backgrounds — subtle tonal differences only */
const CAT_AVATAR_BG: Record<string, string> = {
  football:       '#1a2325',
  politics:       '#1a1f26',
  economy:        '#252015',
  entertainment:  '#251520',
  tech:           '#151f25',
  infrastructure: '#251b15',
  agriculture:    '#151f18',
  updown:         '#151b25',
  default:        '#1d1525',
}

const SORTS: { id: Sort; label: string }[] = [
  { id: 'random',  label: 'Shuffle'  },
  { id: 'pool',    label: 'Biggest'  },
  { id: 'closing', label: 'Closing'  },
  { id: 'newest',  label: 'Newest'   },
]

/* ─── Helpers ────────────────────────────────────────────────── */
function getInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return title.slice(0, 2).toUpperCase()
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return n.toLocaleString()
}

function getTimeLeft(closesAt: string | null): string {
  if (!closesAt) return '—'
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Closed'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(diff / 86400000)
  return `${days}d`
}

function isEndingToday(closesAt: string | null): boolean {
  if (!closesAt) return false
  const d = new Date(closesAt), now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

/* 5-band gauge color: red → amber → grey → lime → green */
function gaugeColor(p: number): string {
  if (p >= 68) return '#22c55e'   // strongly YES
  if (p >= 54) return '#86efac'   // leaning YES
  if (p >= 46) return '#9ca3af'   // near 50/50 — uncertain
  if (p >= 32) return '#fdba74'   // leaning NO
  return '#ef4444'                // strongly NO
}

/* ─── Gauge SVG (semi-circle arc) ───────────────────────────── */
function GaugeSVG({ percent, color }: { percent: number; color: string }) {
  const offset = (125.6 * (1 - percent / 100)).toFixed(1)
  return (
    <div className="flex flex-col items-center" style={{ gap: 0 }}>
      <svg width="56" height="34" viewBox="0 0 100 60">
        <path d="M10,55 A40,40 0 0 1 90,55" fill="none" stroke="var(--fc-gauge-track)" strokeWidth="9" strokeLinecap="round"/>
        <path
          d="M10,55 A40,40 0 0 1 90,55"
          fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset={offset}
          style={{ animation: 'gaugeIn 1s ease-out' }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--fc-text-primary)">{percent}%</text>
      </svg>
      <span style={{ fontSize: 9, color: 'var(--fc-text-secondary)', marginTop: -1, letterSpacing: '0.03em', fontFamily: 'Inter, system-ui, sans-serif' }}>CHANCE</span>
    </div>
  )
}

/* ─── ForecastCard ───────────────────────────────────────────── */
function ForecastCard({ market }: { market: Mkt }) {
  const router  = useRouter()
  const [ripple, setRipple] = useState<'a' | 'b' | null>(null)

  const opts   = market.options ?? []
  const total  = Number(market.total_pool)
  const rake   = Number(market.rake_pct ?? 0.10)
  const net    = total * (1 - rake)
  const isOpen = market.status === 'open'

  const isUpDown = market.metadata?.type === 'updown' || market.metadata?.type === 'price_level'
  const isVs     = !!(market.metadata?.team1Image || market.metadata?.team2Image)

  const opt1  = opts[0]
  const opt2  = opts[1]
  const pool1 = Number(opt1?.total_pool ?? 0)
  const pool2 = Number(opt2?.total_pool ?? 0)

  const prob1    = (total > 0 && pool1 > 0) ? Math.round((pool1 / total) * 100) : 50
  const odds1str = pool1 > 0 ? (net / pool1).toFixed(2) : null
  const odds2str = pool2 > 0 ? (net / pool2).toFixed(2) : null
  const gc       = gaugeColor(prob1)

  const cat      = detectCat(market.title, market.description ?? '', market.metadata)
  const catLabel = CATS.find(c => c.id === cat)?.label ?? 'Other'
  const avatarBg = CAT_AVATAR_BG[cat] ?? '#1d1525'
  const initials = getInitials(market.title)
  const timeStr  = getTimeLeft(market.closes_at)
  const endToday = isEndingToday(market.closes_at) && isOpen

  const isYesNo = opts.length === 2 &&
    opts[0]?.label.toLowerCase() === 'yes' && opts[1]?.label.toLowerCase() === 'no'
  const label1  = isUpDown ? '▲ UP' : isYesNo ? 'YES' : (opt1?.label?.toUpperCase()?.slice(0, 10) ?? 'YES')
  const label2  = isUpDown ? '▼ DOWN' : isYesNo ? 'NO'  : (opt2?.label?.toUpperCase()?.slice(0, 10) ?? 'NO')

  const team1Img = market.metadata?.team1Image as string | undefined
  const team2Img = market.metadata?.team2Image as string | undefined

  /* status text (replaces the old colored badge pill) */
  const statusText = !isOpen
    ? (market.status === 'settled' ? 'SETTLED' : 'CLOSED')
    : endToday ? 'ENDS TODAY'
    : catLabel.toUpperCase()

  const statusColor: React.CSSProperties['color'] = !isOpen
    ? 'var(--fc-text-secondary)'
    : endToday ? '#ef4444'
    : 'var(--fc-text-secondary)'

  const fire = (e: React.MouseEvent, side: 'a' | 'b') => {
    e.stopPropagation()
    setRipple(side)
    setTimeout(() => setRipple(null), 500)
    router.push(`/markets/${market.id}`)
  }

  return (
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      style={{
        background: 'var(--fc-card-bg)',
        border: '1px solid var(--fc-card-border)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color .2s, transform .18s, box-shadow .18s',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#3a4049'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--fc-card-border)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>

          {/* Avatar */}
          {isVs ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 7, overflow: 'hidden',
                background: team1Img ? undefined : avatarBg,
                backgroundImage: team1Img ? `url(${team1Img})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>
                {!team1Img && (opt1?.label?.slice(0, 2).toUpperCase() ?? '?')}
              </div>
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1, color: 'var(--fc-text-secondary)' }}>VS</span>
              <div style={{
                width: 32, height: 32, borderRadius: 7, overflow: 'hidden',
                background: team2Img ? undefined : '#252930',
                backgroundImage: team2Img ? `url(${team2Img})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>
                {!team2Img && (opt2?.label?.slice(0, 2).toUpperCase() ?? '?')}
              </div>
            </div>
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)',
              flexShrink: 0, letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>
          )}

          {/* Status + title */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.06em',
              color: statusColor, marginBottom: 4,
            }}>
              {statusText}
            </div>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: 'var(--fc-text-primary)',
              lineHeight: 1.35,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {market.title}
            </div>
            {market.metadata?.user_created === true && (
              <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.02em' }}>
                🌍 by {market.metadata.creator_username ? `@${String(market.metadata.creator_username)}` : String(market.metadata.creator_name ?? 'Community')}
              </div>
            )}
          </div>
        </div>

        {/* Gauge — hidden for VS markets */}
        {!isVs && (
          <div style={{ flexShrink: 0 }}>
            <GaugeSVG percent={prob1} color={gc} />
          </div>
        )}
      </div>

      {/* ── Bet buttons ── */}
      {isOpen && opt1 && opt2 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={e => fire(e, 'a')}
            style={{
              position: 'relative', overflow: 'hidden',
              border: 'none', cursor: 'pointer',
              borderRadius: 9, padding: '10px 4px',
              fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em',
              background: 'rgba(34,197,94,0.14)', color: '#16a34a',
              animation: 'fcGlowGreen 2.6s ease-in-out infinite',
              transition: 'transform .15s ease, filter .15s ease',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.transform = 'scale(1.04)'; b.style.filter = 'brightness(1.15)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.transform = 'scale(1)'; b.style.filter = 'none' }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
          >
            {label1}{odds1str ? ` ${odds1str}x` : ''}
            {ripple === 'a' && (
              <span style={{ position: 'absolute', inset: 0, margin: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'rgba(34,197,94,0.55)', animation: 'fcRipple .5s ease-out' }} />
            )}
          </button>

          <button
            onClick={e => fire(e, 'b')}
            style={{
              position: 'relative', overflow: 'hidden',
              border: 'none', cursor: 'pointer',
              borderRadius: 9, padding: '10px 4px',
              fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em',
              background: 'rgba(239,68,68,0.12)', color: '#dc2626',
              animation: 'fcGlowRed 2.6s ease-in-out infinite',
              transition: 'transform .15s ease, filter .15s ease',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.transform = 'scale(1.04)'; b.style.filter = 'brightness(1.15)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.transform = 'scale(1)'; b.style.filter = 'none' }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
          >
            {label2}{odds2str ? ` ${odds2str}x` : ''}
            {ripple === 'b' && (
              <span style={{ position: 'absolute', inset: 0, margin: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'rgba(239,68,68,0.55)', animation: 'fcRipple .5s ease-out' }} />
            )}
          </button>
        </div>
      ) : !isOpen ? (
        <div style={{
          borderRadius: 9, padding: '9px 0',
          textAlign: 'center', fontSize: 12, fontWeight: 600,
          color: 'var(--fc-text-secondary)',
          border: '1px solid var(--fc-card-border)',
        }}>
          {market.status === 'settled' ? 'Settled' : 'Closed'}
        </div>
      ) : null}

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--fc-text-secondary)',
        paddingTop: 2, borderTop: '1px solid var(--fc-card-border)',
      }}>
        <span>UGX {fmtVol(total)}</span>
        <span style={{ color: (endToday && isOpen) ? '#ef4444' : 'var(--fc-text-secondary)' }}>{timeStr}</span>
      </div>
    </div>
  )
}

/* ─── MobileCard (shown on screens < md) ────────────────────── */
const CAT_ICONS: Record<string, string> = {
  football: '⚽', politics: '🏛️', economy: '💰', entertainment: '🎵',
  tech: '📱', infrastructure: '🏗️', agriculture: '🌿', updown: '📈', default: '🔮',
}

function MobileCard({ market }: { market: Mkt }) {
  const opts    = market.options ?? []
  const total   = Number(market.total_pool)
  const pool1   = Number(opts[0]?.total_pool ?? 0)
  const prob1   = total > 0 ? Math.round((pool1 / total) * 100) : 50
  const cat     = detectCat(market.title, market.description ?? '', market.metadata)
  const gc      = gaugeColor(prob1)
  const timeStr = getTimeLeft(market.closes_at)
  const isOpen  = market.status === 'open'
  const endToday = isEndingToday(market.closes_at) && isOpen
  const catIcon  = CAT_ICONS[cat] ?? '🔮'
  const avatarBg = CAT_AVATAR_BG[cat] ?? '#1d1525'
  const isFeatured = market.is_featured === true

  const statusText = !isOpen
    ? (market.status === 'settled' ? 'Settled' : 'Closed')
    : endToday ? 'Ends today'
    : timeStr

  return (
    <Link
      href={`/markets/${market.id}`}
      className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
      style={{
        borderBottom: '1px solid var(--fc-card-border)',
        borderTop: isFeatured ? '2px solid var(--mk-accent)' : undefined,
      }}
    >
      {/* Category bubble */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: avatarBg }}
      >
        {catIcon}
      </div>

      {/* Title + status */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold leading-snug"
          style={{
            color: 'var(--fc-text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {market.title}
        </p>
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: endToday ? '#ef4444' : 'var(--fc-text-secondary)' }}
        >
          {statusText}
        </p>
      </div>

      {/* Pool + probability bar */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-[11px] font-bold" style={{ color: 'var(--fc-text-secondary)' }}>
          UGX {fmtVol(total)}
        </span>
        {total > 0 && (
          <div
            className="h-1 w-16 overflow-hidden rounded-full"
            style={{ background: 'var(--fc-card-border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${prob1}%`, background: gc }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

/* ─── Main MarketsClient ─────────────────────────────────────── */
export default function MarketsClient({
  markets,
  openCount: _oc,
  initialCat = 'all',
  totalPool: _tp = 0,
  userCount: _uc = 0,
  isLoggedIn = true,
}: {
  markets: Mkt[]
  openCount: number
  initialCat?: string
  totalPool?: number
  userCount?: number
  isLoggedIn?: boolean
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [search,        setSearch]        = useState('')
  const [cat,           setCat]           = useState<Category>((initialCat as Category) ?? 'all')
  const [sort,          setSort]          = useState<Sort>('random')
  const [showClosed,    setShowClosed]    = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(false)

  const filterPublic = (list: Mkt[]) =>
    list.filter(m => (m.metadata as Record<string, unknown> | undefined)?.private !== true)

  const [liveMarkets, setLiveMarkets] = useState(() => filterPublic(markets))
  useEffect(() => { setLiveMarkets(filterPublic(markets)) }, [markets])

  /* Realtime subscriptions */
  useEffect(() => {
    const ch = supabase
      .channel('markets-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets' }, ({ new: n }) => {
        setLiveMarkets(prev => prev.map(m =>
          m.id === n.id ? { ...m, total_pool: n.total_pool, status: n.status, closes_at: n.closes_at, is_featured: n.is_featured } : m
        ))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_options' }, ({ new: n }) => {
        setLiveMarkets(prev => prev.map(m => ({
          ...m,
          options: m.options.map(o => o.id === n.id ? { ...o, total_pool: n.total_pool } : o),
        })))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'markets' }, async ({ new: n }) => {
        const { data } = await supabase
          .from('markets')
          .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
          .eq('id', n.id).single()
        if (data) {
          const mkt = data as Mkt
          if ((mkt.metadata as Record<string, unknown> | undefined)?.private === true) return
          setLiveMarkets(prev => [mkt, ...prev])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const { watched, loaded: wlLoaded } = useWatchlist()
  const wlCount = wlLoaded ? watched.size : 0

  const open   = useMemo(() => liveMarkets.filter(m => m.status === 'open'),  [liveMarkets])
  const closed = useMemo(() => liveMarkets.filter(m => m.status !== 'open'), [liveMarkets])

  const catCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {}
    for (const m of open) {
      const c = detectCat(m.title, m.description ?? '', m.metadata)
      counts[c] = (counts[c] ?? 0) + 1
    }
    return counts
  }, [open])

  const dailySeed = useMemo(() => {
    const n = new Date()
    return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate()
  }, [])

  const filtered = useMemo(() => {
    if (showWatchlist) return liveMarkets.filter(m => watched.has(m.id))
    let list = showClosed ? liveMarkets : open
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => m.title.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q))
    }
    if (cat === 'updown') {
      list = list.filter(m => m.metadata?.type === 'updown' || m.metadata?.type === 'price_level')
    } else if (cat !== 'all') {
      const isAsset = (m: Mkt) => m.metadata?.type === 'updown' || m.metadata?.type === 'price_level'
      list = list.filter(m => !isAsset(m) && detectCat(m.title, m.description ?? '', m.metadata) === cat)
    }
    if      (sort === 'random')  list = seededShuffle(list, dailySeed)
    else if (sort === 'pool')    list = [...list].sort((a, b) => Number(b.total_pool) - Number(a.total_pool))
    else if (sort === 'closing') list = [...list].sort((a, b) => {
      if (!a.closes_at) return 1; if (!b.closes_at) return -1
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
    })
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }, [liveMarkets, open, search, cat, sort, showClosed, showWatchlist, watched, dailySeed])

  const handleCatChange = useCallback((newCat: Category) => {
    setCat(newCat)
    const params = new URLSearchParams(window.location.search)
    if (newCat === 'all') params.delete('cat')
    else params.set('cat', newCat)
    const qs = params.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router])

  const hasFilters = !!(search.trim() || cat !== 'all')

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══ Sticky header ══ */}
      <div
        className="sticky top-[61px] z-10"
        style={{
          background: 'var(--fc-cat-bg)',
          borderBottom: '1px solid var(--fc-cat-border)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Category tabs — text only, no emoji */}
        <div
          className="scrollbar-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 24px', overflowX: 'auto', whiteSpace: 'nowrap' }}
        >
          {CATS.map(c => {
            const active = cat === c.id && !showWatchlist
            const count  = c.id === 'all' ? open.length : (catCounts[c.id as Category] ?? 0)
            return (
              <button
                key={c.id}
                onClick={() => { setShowWatchlist(false); handleCatChange(c.id) }}
                style={{
                  fontSize: '13px', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--fc-text-primary)' : 'var(--fc-text-secondary)',
                  cursor: 'pointer', flexShrink: 0,
                  background: 'none', border: 'none', padding: '4px 0',
                  borderBottom: active ? '2px solid var(--fc-text-primary)' : '2px solid transparent',
                  transition: 'color .15s, border-color .15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span>{c.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.12)' : 'rgba(128,128,128,0.1)',
                    color: active ? 'var(--fc-text-primary)' : 'var(--fc-text-secondary)',
                    borderRadius: 4, padding: '1px 5px',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Watchlist tab */}
          {wlCount > 0 && (
            <button
              onClick={() => setShowWatchlist(v => !v)}
              style={{
                fontSize: '13px', fontWeight: showWatchlist ? 700 : 500,
                color: showWatchlist ? 'var(--fc-text-primary)' : 'var(--fc-text-secondary)',
                cursor: 'pointer', flexShrink: 0,
                background: 'none', border: 'none', padding: '4px 0',
                borderBottom: showWatchlist ? '2px solid var(--fc-text-primary)' : '2px solid transparent',
                transition: 'color .15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              Watchlist
              <span style={{
                fontSize: '10px', fontWeight: 700,
                background: showWatchlist ? 'rgba(255,255,255,0.12)' : 'rgba(128,128,128,0.1)',
                color: showWatchlist ? 'var(--fc-text-primary)' : 'var(--fc-text-secondary)',
                borderRadius: 4, padding: '1px 5px',
              }}>{wlCount}</span>
            </button>
          )}

          <div style={{ flex: 1 }} />
          <Link
            href="/create"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#16a34a', color: '#fff',
              fontSize: '12.5px', fontWeight: 700,
              padding: '6px 14px', borderRadius: 8,
              flexShrink: 0, textDecoration: 'none',
              transition: 'background .15s',
            }}
          >
            + Create
          </Link>
        </div>

        {/* Filter row */}
        <div
          className="scrollbar-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px 11px', overflowX: 'auto', whiteSpace: 'nowrap' }}
        >
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--fc-card-bg)',
            border: '1px solid var(--fc-card-border)',
            borderRadius: 8, padding: '6px 11px', flex: '0 1 220px', minWidth: 130,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" stroke="var(--fc-text-secondary)" strokeWidth="2"/>
              <path d="M21 21L16.5 16.5" stroke="var(--fc-text-secondary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 12.5, color: 'var(--fc-text-primary)',
                width: '100%', fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--fc-text-secondary)', flexShrink: 0 }}>✕</button>
            )}
          </div>

          {/* Sort pills */}
          {SORTS.map(s => {
            const active = sort === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                style={{
                  padding: '6px 13px', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                  background: active ? '#16a34a' : 'var(--fc-card-bg)',
                  color: active ? '#fff' : 'var(--fc-text-secondary)',
                  border: `1px solid ${active ? '#16a34a' : 'var(--fc-card-border)'}`,
                  transition: 'all .15s',
                }}
              >
                {s.label}
              </button>
            )
          })}

          {/* Show settled */}
          {closed.length > 0 && (
            <button
              onClick={() => setShowClosed(v => !v)}
              style={{
                padding: '6px 13px', borderRadius: 8,
                fontSize: 12.5, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                background: showClosed ? 'rgba(100,100,100,0.12)' : 'var(--fc-card-bg)',
                color: 'var(--fc-text-secondary)',
                border: '1px solid var(--fc-card-border)',
                transition: 'all .15s',
              }}
            >
              {showClosed ? 'Hide settled' : `+${closed.length} settled`}
            </button>
          )}

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setCat('all') }}
              style={{
                padding: '6px 13px', borderRadius: 8,
                fontSize: 12.5, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                background: 'none', color: '#16a34a',
                border: '1px solid #16a34a',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ══ Logged-out hero strip ══ */}
      {!isLoggedIn && (
        <div
          className="mx-6 mt-3 mb-0 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'var(--mk-raised)',
            border: '1px solid var(--mk-border)',
          }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--mk-text)' }}>
              Uganda&apos;s prediction market
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--mk-muted)' }}>
              Predict politics, football &amp; more. Win via MTN / Airtel.
            </p>
          </div>
          <Link
            href="/auth"
            className="shrink-0 rounded-r-btn px-4 py-2 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'var(--mk-accent)' }}
          >
            Sign up free →
          </Link>
        </div>
      )}

      {/* ══ Create-your-market hero banner ══ */}
      <div style={{
        margin: '12px 24px 0',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(79,142,247,0.09) 100%)',
        border: '1px solid rgba(139,92,246,0.22)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 3 }}>
            Got a prediction? Make it a market.
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fc-text-secondary)', lineHeight: 1.5 }}>
            Create your own question, set the sides, and let Uganda decide — UGX 5,000 to launch.
          </div>
        </div>
        <Link
          href="/create"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#7c3aed',
            color: '#fff',
            fontSize: 13, fontWeight: 800,
            padding: '9px 18px', borderRadius: 9,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
          onMouseLeave={e => (e.currentTarget.style.background = '#7c3aed')}
        >
          🌍 Create a Market
        </Link>
      </div>

      {/* ══ Stats bar ══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px 2px' }}>
        <span style={{ fontSize: 11.5, color: 'var(--fc-text-secondary)' }}>
          <strong style={{ color: 'var(--fc-text-primary)', fontWeight: 700 }}>{filtered.length}</strong>
          {' '}market{filtered.length !== 1 ? 's' : ''}
          {search && <> · &ldquo;{search}&rdquo;</>}
          {!showWatchlist && cat !== 'all' && <> · {CATS.find(c => c.id === cat)?.label}</>}
          {showWatchlist && <> · Watchlist</>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--fc-text-secondary)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <strong style={{ color: '#16a34a', fontWeight: 700 }}>{open.length}</strong> live
        </span>
      </div>

      {/* ══ Market grid ══ */}
      <div style={{ paddingBottom: 96 }}>
        {filtered.length > 0 ? (
          <>
            {/* Mobile list — shown on screens narrower than md (768px) */}
            <div className="md:hidden">
              {filtered.map(m => <MobileCard key={m.id} market={m} />)}
            </div>
            {/* Desktop grid — shown on md+ */}
            <div className="hidden md:block" style={{ padding: '8px 24px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 14 }}>
                {filtered.map(m => <ForecastCard key={m.id} market={m} />)}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 24px', textAlign: 'center',
            border: '1px dashed var(--fc-card-border)', borderRadius: 16, marginTop: 8,
          }}>
            <p style={{ fontSize: 42, margin: 0 }}>{showWatchlist ? '☆' : hasFilters ? '○' : '◇'}</p>
            <p style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: 'var(--fc-text-secondary)' }}>
              {showWatchlist ? 'Your watchlist is empty.' : hasFilters ? 'No markets match your filters.' : 'No open markets yet.'}
            </p>
            {(hasFilters || showWatchlist) && (
              <button
                onClick={() => { setSearch(''); setCat('all'); setShowWatchlist(false) }}
                style={{ marginTop: 12, fontSize: 13, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
