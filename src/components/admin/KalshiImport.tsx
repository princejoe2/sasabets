'use client'
import { useState } from 'react'

interface KalshiMarket {
  ticker: string
  title: string
  yesBid: number
  noBid: number
  volume: number
  volume24h: number
  closeTime: string | null
}

interface Props {
  onImport: (title: string, optA: string, optB: string, conditionId: string) => void
}

export default function KalshiImport({ onImport }: Props) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<KalshiMarket[]>([])
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [imported,    setImported]    = useState<string | null>(null)
  const [cursor,      setCursor]      = useState('')
  const [hasMore,     setHasMore]     = useState(false)

  async function fetchPage(cur: string, append: boolean) {
    if (append) setLoadingMore(true)
    else        setLoading(true)

    try {
      const params = new URLSearchParams({ q: query })
      if (cur) params.set('cursor', cur)
      const res  = await fetch(`/api/kalshi/search?${params}`)
      const data = await res.json()
      const markets: KalshiMarket[] = Array.isArray(data.markets) ? data.markets : []
      setResults(prev => append ? [...prev, ...markets] : markets)
      setHasMore(!!data.hasMore)
      setCursor(data.cursor ?? '')
    } catch {
      if (!append) setResults([])
    }

    setSearched(true)
    if (append) setLoadingMore(false)
    else        setLoading(false)
  }

  async function search() {
    setCursor('')
    setSearched(false)
    await fetchPage('', false)
  }

  async function loadMore() {
    await fetchPage(cursor, true)
  }

  function handleImport(m: KalshiMarket) {
    // Kalshi markets are always Yes/No binary; no auto-verification conditionId
    onImport(m.title, 'Yes', 'No', '')
    setImported(m.ticker)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search Kalshi… bitcoin, election, fed, sports"
          className="flex-1 rounded-xl border border-[#2a2a3e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-teal-600 placeholder:text-slate-600"
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold transition-colors hover:bg-teal-600 disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {!searched && !loading && (
        <p className="text-[11px] text-slate-600 text-center">
          Search US prediction markets on Kalshi. Imports as a manual-verification market.
        </p>
      )}

      {loading && (
        <p className="py-6 text-center text-sm text-slate-500 animate-pulse">Loading markets…</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No markets found — try a broader keyword.</p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-[11px] text-slate-600">
            {results.length} market{results.length !== 1 ? 's' : ''} loaded
          </p>

          <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
            {results.map(m => {
              const isImported = imported === m.ticker
              return (
                <div
                  key={m.ticker}
                  className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4 transition-colors hover:border-[#2a2a3e]"
                >
                  <p className="mb-2.5 text-sm font-semibold leading-snug text-slate-200">
                    {m.title}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span>
                        <span className="font-bold text-teal-400">Yes: {m.yesBid}¢</span>
                        <span className="mx-1 text-slate-700">·</span>
                        <span className="font-bold text-amber-400">No: {m.noBid}¢</span>
                      </span>
                      {m.volume24h > 0 && (
                        <span className="text-slate-600">
                          ${m.volume24h >= 1000 ? `${(m.volume24h / 1000).toFixed(1)}K` : m.volume24h.toFixed(0)} 24h
                        </span>
                      )}
                      {m.closeTime && (
                        <span className="text-slate-700">
                          Ends {new Date(m.closeTime).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleImport(m)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        isImported
                          ? 'bg-emerald-900/40 text-emerald-400 cursor-default'
                          : 'bg-teal-800/40 text-teal-400 hover:bg-teal-700/50'
                      }`}
                    >
                      {isImported ? 'Imported ✓' : 'Import →'}
                    </button>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-xl border border-slate-800 bg-[#0d0d14] py-3 text-sm font-bold text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Loading…' : 'Load more markets ↓'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
