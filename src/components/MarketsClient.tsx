'use client'
import { useState, useMemo } from 'react'
import MarketCard from '@/components/MarketCard'

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

type Mkt = {
  id: string; title: string; description: string | null
  total_pool: number; options: Array<{ id: string; label: string; total_pool: number }>
  closes_at: string | null; created_at: string; status: string; rake_pct: number
  metadata?: Record<string, unknown>
}

type Category = 'all' | 'updown' | 'football' | 'politics' | 'economy' | 'entertainment' | 'tech' | 'infrastructure' | 'agriculture' | 'default'
type Sort = 'random' | 'pool' | 'closing' | 'newest'

function detectCat(title: string, desc = ''): Exclude<Category, 'all'> {
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|premier.?league|fufa|kcca.*fc|vipers|express.?fc|cranes|afcon|scorer|derby|sc.villa|bul.fc|world.?cup|golden.?boot|messi|haaland|mbapp|bellingham|ronaldo|england.*group|group.?l|norway.*wc|wc.*final|africa.*semi|wc.*semi/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|social.?media.?tax|vote|contest|treason|muhoozi|lukwago|speaker|nabbanja|minister|mp.be|nup.mp|vetting|ayebare|oboth|foreign.?affair/.test(t)) return 'politics'
  if (/oil.?production|exchange.?rate|ugx.*usd|usd.*ugx|bank.*branch|share.?price|startup.?fund|largest.?fund|mtn.?uganda.?(share|profit|report)|robusta|farmgate|coffee|bitcoin|btc|crypto|gdp|shilling|profit|economy/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|eddy.?kenzo|chameleone|fik.?fameica|pallaso|winnie.?nwagi|headline|ai.?product|openai|google.?deep/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel.?money|mtn.?momo|telecom|users.?in.?uganda/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road.?repair|kampala.*jinja/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|long.?rains/.test(t)) return 'agriculture'
  return 'default'
}

const CATS: { id: Category; icon: string; label: string; color: string; bg: string; border: string }[] = [
  { id: 'all',            icon: '🔮', label: 'All',            color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.5)' },
  { id: 'updown',         icon: '📈', label: 'Up/Down',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.45)' },
  { id: 'football',       icon: '⚽', label: 'Football',       color: '#a3e635', bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.45)' },
  { id: 'politics',       icon: '🏛️', label: 'Politics',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.45)'  },
  { id: 'economy',        icon: '💰', label: 'Economy',        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.45)'  },
  { id: 'entertainment',  icon: '🎵', label: 'Entertainment',  color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.45)' },
  { id: 'tech',           icon: '📱', label: 'Technology',     color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.45)'  },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructure', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.45)'  },
  { id: 'agriculture',    icon: '🌿', label: 'Agriculture',    color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.45)'  },
  { id: 'default',        icon: '✨', label: 'Other',          color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.4)'  },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: 'random',  label: '🔀 Shuffle'   },
  { id: 'pool',    label: 'Biggest pool' },
  { id: 'closing', label: 'Closing soon' },
  { id: 'newest',  label: 'Newest'       },
]

export default function MarketsClient({ markets, openCount }: { markets: Mkt[]; openCount: number }) {
  const [search, setSearch]         = useState('')
  const [cat, setCat]               = useState<Category>('all')
  const [sort, setSort]             = useState<Sort>('random')
  const [showClosed, setShowClosed] = useState(false)

  const dailySeed = useMemo(() => {
    const n = new Date()
    return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate()
  }, [])

  const open   = useMemo(() => markets.filter(m => m.status === 'open'),  [markets])
  const closed = useMemo(() => markets.filter(m => m.status !== 'open'), [markets])

  const filtered = useMemo(() => {
    let list = showClosed ? markets : open

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
      )
    }

    if (cat === 'updown') {
      list = list.filter(m => m.metadata?.type === 'updown')
    } else if (cat !== 'all') {
      list = list.filter(m => m.metadata?.type !== 'updown' && detectCat(m.title, m.description ?? '') === cat)
    }

    if (sort === 'random') {
      list = seededShuffle(list, dailySeed)
    } else if (sort === 'pool') {
      list = [...list].sort((a, b) => Number(b.total_pool) - Number(a.total_pool))
    } else if (sort === 'closing') {
      list = [...list].sort((a, b) => {
        if (!a.closes_at) return 1
        if (!b.closes_at) return -1
        return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
      })
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    return list
  }, [markets, open, search, cat, sort, showClosed, dailySeed])

  const activeCat  = CATS.find(c => c.id === cat)!
  const hasFilters = !!(search.trim() || cat !== 'all')
  const totalPool  = open.reduce((s, m) => s + Number(m.total_pool), 0)

  return (
    <div>
      {/* ── Sticky filter bar ── */}
      <div className="sticky top-[61px] z-10 border-b border-[#1e1e2e] bg-[#0d0d14]/95 backdrop-blur-xl">

        {/* Quick stats strip */}
        <div className="border-b border-[#1a1a28] px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center gap-5 text-[11px] font-semibold">
            <span className="text-slate-600">
              <span className="font-bold text-emerald-400">{openCount}</span> open markets
            </span>
            <span className="text-slate-600">
              <span className="font-bold text-violet-400">UGX {totalPool.toLocaleString()}</span> total pool
            </span>
            {closed.length > 0 && (
              <button
                onClick={() => setShowClosed(v => !v)}
                className="ml-auto text-slate-600 transition-colors hover:text-slate-300"
              >
                {showClosed ? '← hide settled' : `show ${closed.length} settled →`}
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 pt-3">
          <div className="mx-auto max-w-6xl space-y-3">

            {/* Search input */}
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search markets, teams, topics…"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#111118] py-2 pl-8 pr-8 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-600/70"
                style={search ? { borderColor: activeCat.border } : {}}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[#2a2a3e] text-[9px] text-slate-400 transition-colors hover:bg-[#3a3a5e] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category pills + sort */}
            <div className="flex items-center gap-2">
              {/* Scrollable pills */}
              <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {CATS.map(c => {
                  const active = cat === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCat(c.id)}
                      className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
                      style={active
                        ? { background: c.bg, borderColor: c.border, color: c.color, boxShadow: `0 0 14px ${c.bg}`, transform: 'translateY(-1px)' }
                        : { background: 'transparent', borderColor: '#2a2a3e', color: '#64748b' }
                      }
                    >
                      {c.icon} {c.label}
                    </button>
                  )
                })}
              </div>

              {/* Sort */}
              <div className="flex shrink-0 gap-1 rounded-xl border border-[#2a2a3e] bg-[#0d0d14] p-1">
                {SORTS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                      sort === s.id
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/60'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Market grid ── */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {filtered.length > 0 ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                <span className="text-slate-400 font-semibold">{filtered.length}</span> market{filtered.length !== 1 ? 's' : ''}
                {search && <> · &ldquo;{search}&rdquo;</>}
                {cat !== 'all' && <> · {activeCat.icon} {activeCat.label}</>}
                <span className="ml-2 text-slate-700">
                  · sorted by <span className="text-violet-500">{SORTS.find(s => s.id === sort)?.label}</span>
                </span>
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setCat('all') }}
                  className="text-[11px] text-violet-500 underline underline-offset-2 transition-colors hover:text-violet-300"
                >
                  clear filters
                </button>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(m => (
                <div key={m.id} className="relative">
                  {m.metadata?.type === 'updown' && (
                    <div className="absolute -top-2 left-4 z-10 flex items-center gap-1 rounded-full border border-emerald-700/50 bg-emerald-900/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      📈 Up/Down
                    </div>
                  )}
                  <MarketCard
                    market={{ ...m, description: m.description ?? undefined }}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0d0d14] py-24 text-center">
            <p className="text-5xl">{hasFilters ? '🔍' : '🔮'}</p>
            <p className="mt-4 text-base font-semibold text-slate-400">
              {hasFilters ? 'No markets match your filters.' : 'No open markets yet.'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setCat('all') }}
                className="mt-3 text-sm text-violet-400 transition-colors hover:text-violet-300"
              >
                Clear filters →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
