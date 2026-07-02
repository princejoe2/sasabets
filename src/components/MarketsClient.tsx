'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MarketCard from '@/components/MarketCard'
import OnboardingBanner from '@/components/OnboardingBanner'
import { useWatchlist } from '@/hooks/useWatchlist'
import { createClient } from '@/lib/supabase/client'

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

const VALID_CATS: Category[] = ['football','politics','economy','entertainment','tech','infrastructure','agriculture','updown','default']

function detectCat(title: string, desc = '', metadata?: Record<string, unknown>): Exclude<Category, 'all'> {
  if (metadata?.type === 'updown') return 'updown'
  const stored = metadata?.category as string | undefined
  if (stored && VALID_CATS.includes(stored as Category)) return stored as Exclude<Category, 'all'>
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
  { id: 'all',            icon: '🔮', label: 'All',            color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.3)'  },
  { id: 'updown',         icon: '📈', label: 'Up/Down',        color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.3)'   },
  { id: 'football',       icon: '⚽', label: 'Football',       color: '#65a30d', bg: 'rgba(101,163,13,0.08)',  border: 'rgba(101,163,13,0.3)'  },
  { id: 'politics',       icon: '🏛️', label: 'Politics',       color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.3)'   },
  { id: 'economy',        icon: '💰', label: 'Economy',        color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)'   },
  { id: 'entertainment',  icon: '🎵', label: 'Entertainment',  color: '#db2777', bg: 'rgba(219,39,119,0.08)',  border: 'rgba(219,39,119,0.3)'  },
  { id: 'tech',           icon: '📱', label: 'Technology',     color: '#0891b2', bg: 'rgba(8,145,178,0.08)',   border: 'rgba(8,145,178,0.3)'   },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructure', color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.3)'   },
  { id: 'agriculture',    icon: '🌿', label: 'Agriculture',    color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.3)'   },
  { id: 'default',        icon: '✨', label: 'Other',          color: '#7c3aed', bg: 'rgba(124,58,237,0.06)',  border: 'rgba(124,58,237,0.25)' },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: 'random',  label: '🔀 Shuffle'   },
  { id: 'pool',    label: 'Biggest pool' },
  { id: 'closing', label: 'Closing soon' },
  { id: 'newest',  label: 'Newest'       },
]

export default function MarketsClient({ markets, openCount: _openCount, initialCat = 'all' }: { markets: Mkt[]; openCount: number; initialCat?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch]         = useState('')
  const [cat, setCat]               = useState<Category>((initialCat as Category) ?? 'all')
  const [sort, setSort]             = useState<Sort>('random')
  const [showClosed, setShowClosed] = useState(false)
  const [showWatchlist, setShowWatchlist] = useState(false)

  const [liveMarkets, setLiveMarkets] = useState(markets)

  // Keep liveMarkets in sync if the server re-sends props (e.g., navigation)
  useEffect(() => { setLiveMarkets(markets) }, [markets])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('markets-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets' },
        (payload) => {
          setLiveMarkets(prev => prev.map(m =>
            m.id === payload.new.id
              ? { ...m, total_pool: payload.new.total_pool, status: payload.new.status, closes_at: payload.new.closes_at }
              : m
          ))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market_options' },
        (payload) => {
          setLiveMarkets(prev => prev.map(m => ({
            ...m,
            options: m.options.map((opt: { id: string; label: string; total_pool: number }) =>
              opt.id === payload.new.id
                ? { ...opt, total_pool: payload.new.total_pool }
                : opt
            )
          })))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'markets' },
        async (payload) => {
          const { data } = await supabase
            .from('markets')
            .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
            .eq('id', payload.new.id)
            .single()
          if (data) setLiveMarkets(prev => [data as Mkt, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const liveOpenCount = liveMarkets.filter(m => m.status === 'open').length

  const { watched, loaded: watchlistLoaded } = useWatchlist()
  const watchlistCount = watchlistLoaded ? watched.size : 0

  function handleCatChange(newCat: Category) {
    setCat(newCat)
    const params = new URLSearchParams(window.location.search)
    if (newCat === 'all') params.delete('cat')
    else params.set('cat', newCat)
    const qs = params.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const dailySeed = useMemo(() => {
    const n = new Date()
    return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate()
  }, [])

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

  const filtered = useMemo(() => {
    // If watchlist mode, show only watched markets (skip all other filters)
    if (showWatchlist) {
      return liveMarkets.filter(m => watched.has(m.id))
    }

    let list = showClosed ? liveMarkets : open

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
      list = list.filter(m => m.metadata?.type !== 'updown' && detectCat(m.title, m.description ?? '', m.metadata) === cat)
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
  }, [liveMarkets, open, search, cat, sort, showClosed, showWatchlist, watched, dailySeed])

  const activeCat  = CATS.find(c => c.id === cat)!
  const hasFilters = !!(search.trim() || cat !== 'all')

  return (
    <div className="page-enter">
      {/* ── Sticky filter bar ── */}
      <div className="sticky top-[61px] z-10 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">

        <div className="px-4 py-3">
          <div className="mx-auto max-w-6xl space-y-3">

            {/* Row 1: search full-width on mobile, sort below on mobile / inline on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Search — full width on mobile */}
              <div className="relative w-full sm:flex-1">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search markets…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-7 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-700"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] text-slate-500 transition-colors hover:bg-slate-300"
                  >✕</button>
                )}
              </div>

              {/* Sort — full width on mobile, shrink on desktop */}
              <div className="flex w-full sm:w-auto sm:shrink-0 gap-2">
                <div className="flex flex-1 sm:flex-none gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  {SORTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSort(s.id)}
                      className={`flex-1 sm:flex-none rounded-lg px-2.5 py-2.5 sm:py-1.5 text-[11px] font-bold transition-all min-h-[44px] sm:min-h-0 ${
                        sort === s.id
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {/* Refresh button — mobile only */}
                <button
                  onClick={() => window.location.reload()}
                  className="sm:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  aria-label="Refresh"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
              </div>

              {/* Stats + settled toggle */}
              <span className="flex items-center gap-1 shrink-0 text-xs font-semibold text-slate-500 hidden sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="font-black text-emerald-600">{liveOpenCount}</span> live
              </span>
              {closed.length > 0 && (
                <button
                  onClick={() => setShowClosed(v => !v)}
                  className="shrink-0 text-xs text-slate-400 transition-colors hover:text-slate-700 hidden sm:block"
                >
                  {showClosed ? '← hide settled' : `+${closed.length} settled`}
                </button>
              )}
            </div>

            {/* Row 2: Categories — horizontally scrollable on mobile, wrapping on desktop */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
              {watchlistCount > 0 && (
                <button
                  onClick={() => setShowWatchlist(v => !v)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-black transition-all min-h-[44px] shrink-0 ${
                    showWatchlist
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400'
                  }`}
                  style={showWatchlist ? { boxShadow: '0 4px 14px rgba(245,158,11,0.4)' } : undefined}
                >
                  <span>⭐</span>
                  <span>Watchlist</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    showWatchlist ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>{watchlistCount}</span>
                </button>
              )}
              {CATS.map(c => {
                const active = cat === c.id
                const count  = c.id === 'all' ? open.length : (catCounts[c.id] ?? 0)
                return (
                  <button
                    key={c.id}
                    onClick={() => handleCatChange(c.id)}
                    className="flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-black transition-all min-h-[44px] shrink-0"
                    style={active
                      ? { background: c.color, borderColor: c.color, color: '#fff', boxShadow: `0 4px 14px ${c.color}55`, transform: 'translateY(-2px)' }
                      : { background: `${c.color}12`, borderColor: `${c.color}35`, color: c.color }
                    }
                  >
                    <span className="text-base leading-none">{c.icon}</span>
                    <span>{c.label}</span>
                    {count > 0 && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none"
                        style={active
                          ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                          : { background: `${c.color}22`, color: c.color }
                        }
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </div>

      {/* ── Onboarding banner ── */}
      <OnboardingBanner />

      {/* ── Market grid ── */}
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:pb-8">
        {filtered.length > 0 ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                <span className="text-slate-700 font-semibold">{filtered.length}</span> market{filtered.length !== 1 ? 's' : ''}
                {search && <> · &ldquo;{search}&rdquo;</>}
                {cat !== 'all' && <> · {activeCat.icon} {activeCat.label}</>}
                <span className="ml-2 text-slate-300">
                  · sorted by <span className="text-violet-500">{SORTS.find(s => s.id === sort)?.label}</span>
                </span>
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setCat('all') }}
                  className="text-[11px] text-violet-600 underline underline-offset-2 transition-colors hover:text-violet-400"
                >
                  clear filters
                </button>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(m => (
                <div key={m.id} className="relative">
                  {m.metadata?.type === 'updown' && (
                    <div className="absolute -top-2 left-4 z-10 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center dark:border-slate-700 dark:bg-slate-800/50">
            {showWatchlist ? (
              <>
                <p className="text-5xl">⭐</p>
                <p className="mt-4 text-base font-semibold text-slate-500">Your watchlist is empty.</p>
                <p className="mt-1 text-sm text-slate-400">Click the bookmark icon on any market to save it here.</p>
                <button onClick={() => setShowWatchlist(false)} className="mt-3 text-sm text-violet-600">Browse markets →</button>
              </>
            ) : (
              <>
                <p className="text-5xl">{hasFilters ? '🔍' : '🔮'}</p>
                <p className="mt-4 text-base font-semibold text-slate-500">
                  {hasFilters ? 'No markets match your filters.' : 'No open markets yet.'}
                </p>
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(''); setCat('all') }}
                    className="mt-3 text-sm text-violet-600 transition-colors hover:text-violet-400"
                  >
                    Clear filters →
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
