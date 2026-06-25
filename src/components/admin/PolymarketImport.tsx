'use client'
import { useState } from 'react'

interface PMMarket {
  id: string
  question: string
  outcomes: string[]
  outcomePrices: string[]
  volume24hr: number
  volume: number
  endDate: string | null
  conditionId: string
}

interface Props {
  onImport: (title: string, optA: string, optB: string, conditionId: string) => void
}

export default function PolymarketImport({ onImport }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<PMMarket[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [imported, setImported] = useState<string | null>(null)
  const [page,     setPage]     = useState(0)
  const [hasMore,  setHasMore]  = useState(false)

  async function fetchPage(pageNum: number, append: boolean) {
    if (append) setLoadingMore(true)
    else        setLoading(true)

    try {
      const res  = await fetch(`/api/polymarket/search?q=${encodeURIComponent(query)}&page=${pageNum}`)
      const data = await res.json()
      const markets: PMMarket[] = Array.isArray(data.markets) ? data.markets : []
      setResults(prev => append ? [...prev, ...markets] : markets)
      setHasMore(!!data.hasMore)
      setPage(pageNum)
    } catch {
      if (!append) setResults([])
    }

    setSearched(true)
    if (append) setLoadingMore(false)
    else        setLoading(false)
  }

  async function search() {
    setPage(0)
    setSearched(false)
    await fetchPage(0, false)
  }

  async function loadMore() {
    await fetchPage(page + 1, true)
  }

  function handleImport(m: PMMarket) {
    onImport(m.question, m.outcomes[0] ?? 'Yes', m.outcomes[1] ?? 'No', m.conditionId)
    setImported(m.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search Polymarket… bitcoin, election, africa, oil"
          className="flex-1 rounded-xl border border-[#2a2a3e] bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-600 placeholder:text-slate-600"
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold transition-colors hover:bg-violet-600 disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {!searched && !loading && (
        <p className="text-[11px] text-slate-600 text-center">
          Search to see global prediction markets. Click Import to pre-fill the form below.
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
              const probA    = Math.round(parseFloat(m.outcomePrices[0] ?? '0.5') * 100)
              const probB    = 100 - probA
              const vol24h   = m.volume24hr
              const isImported = imported === m.id

              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4 transition-colors hover:border-[#2a2a3e]"
                >
                  <p className="mb-2.5 text-sm font-semibold leading-snug text-slate-200">
                    {m.question}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span>
                        <span className="font-bold text-violet-400">{m.outcomes[0]}: {probA}%</span>
                        <span className="mx-1 text-slate-700">·</span>
                        <span className="font-bold text-amber-400">{m.outcomes[1]}: {probB}%</span>
                      </span>
                      {vol24h > 0 && (
                        <span className="text-slate-600">
                          ${vol24h >= 1000 ? `${(vol24h / 1000).toFixed(1)}K` : vol24h.toFixed(0)} 24h
                        </span>
                      )}
                      {m.endDate && (
                        <span className="text-slate-700">
                          Ends {new Date(m.endDate).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleImport(m)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        isImported
                          ? 'bg-emerald-900/40 text-emerald-400 cursor-default'
                          : 'bg-emerald-800/40 text-emerald-400 hover:bg-emerald-700/50'
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
                {loadingMore ? 'Loading…' : `Load more markets ↓`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
