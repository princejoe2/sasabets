'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateMarketForm from '@/components/CreateMarketForm'
import SettleMarketForm from '@/components/SettleMarketForm'
import PolymarketImport from '@/components/admin/PolymarketImport'

interface Market {
  id: string; title: string; status: string; total_pool: number;
  options: Array<{ id: string; label: string; total_pool: number }>;
  closes_at: string | null; created_at: string; rake_pct: number;
  verification_type?: string; verification_config?: Record<string, unknown>;
}

interface Prefill { title: string; optA: string; optB: string; conditionId?: string }

const VER_BADGE: Record<string, { icon: string; color: string }> = {
  crypto_price: { icon: '₿',  color: 'text-amber-400 bg-amber-900/20 border-amber-800/30' },
  fx_rate:      { icon: '💱', color: 'text-cyan-400 bg-cyan-900/20 border-cyan-800/30'    },
  polymarket:   { icon: '🌐', color: 'text-violet-400 bg-violet-900/20 border-violet-800/30' },
  football:     { icon: '⚽', color: 'text-green-400 bg-green-900/20 border-green-800/30'  },
}

interface AutoSettleResult {
  id: string; title: string; status: string; winner?: string; error?: string
}

export default function AdminMarketsClient({ markets }: { markets: Market[] }) {
  const router = useRouter()

  const [showCreate,     setShowCreate]     = useState(false)
  const [showPolyImport, setShowPolyImport] = useState(false)
  const [prefill,        setPrefill]        = useState<Prefill | undefined>()
  const [settleMarket,   setSettleMarket]   = useState<Market | null>(null)
  const [filter,         setFilter]         = useState<'all' | 'open' | 'closed' | 'settled'>('all')

  // Auto-settle state
  const [autoRunning,  setAutoRunning]  = useState(false)
  const [autoResults,  setAutoResults]  = useState<{ settled: number; pending: number; results: AutoSettleResult[] } | null>(null)

  const filtered = markets.filter(m => filter === 'all' || m.status === filter)

  function handleImport(title: string, optA: string, optB: string, conditionId: string) {
    setPrefill({ title, optA, optB, conditionId })
    setShowCreate(true)
    setSettleMarket(null)
    setTimeout(() => document.getElementById('create-market-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function runAutoSettle() {
    setAutoRunning(true)
    setAutoResults(null)
    try {
      const res  = await fetch('/api/admin/auto-settle', { method: 'POST' })
      const data = await res.json()
      setAutoResults(data)
      if (data.settled > 0) router.refresh()
    } catch {
      setAutoResults({ settled: 0, pending: 0, results: [{ id: '', title: 'Network error', status: 'error' }] })
    }
    setAutoRunning(false)
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 rounded-xl border border-[#1a1a28] bg-[#0d0d18] p-1">
          {(['all','open','closed','settled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${filter === f ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={runAutoSettle} disabled={autoRunning}
            className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
          >
            {autoRunning ? '⟳ Running…' : '⚡ Auto-Settle'}
          </button>
          <button
            onClick={() => setShowPolyImport(!showPolyImport)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              showPolyImport
                ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                : 'border-violet-800/50 bg-violet-900/20 text-violet-400 hover:bg-violet-900/40'
            }`}
          >
            {showPolyImport ? '✕ Close Import' : '🔍 Import from Polymarket'}
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setSettleMarket(null); if (showCreate) setPrefill(undefined) }}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold hover:bg-emerald-600 transition-colors"
          >
            {showCreate ? '✕ Cancel' : '+ New Market'}
          </button>
        </div>
      </div>

      {/* Auto-settle results */}
      {autoResults && (
        <div className={`mb-5 rounded-2xl border p-4 ${autoResults.settled > 0 ? 'border-emerald-800/30 bg-emerald-900/10' : 'border-[#1a1a28] bg-[#0d0d18]'}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-200">
              Auto-settle results — {autoResults.settled} settled, {autoResults.pending} pending
            </p>
            <button onClick={() => setAutoResults(null)} className="text-xs text-slate-600 hover:text-slate-400">✕</button>
          </div>
          <div className="space-y-1">
            {autoResults.results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className={r.status === 'settled' ? 'text-emerald-400' : r.status === 'error' ? 'text-red-400' : 'text-slate-500'}>
                  {r.status === 'settled' ? '✓' : r.status === 'error' ? '✗' : '○'}
                </span>
                <span className="text-slate-400">{r.title || 'Unknown market'}</span>
                {r.status === 'settled' && <span className="text-emerald-600">→ {r.winner}</span>}
                {r.error && <span className="text-red-600">{r.error}</span>}
                {r.status === 'pending' && <span className="text-slate-600">outcome not yet available</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Polymarket import panel */}
      {showPolyImport && (
        <div className="mb-5 rounded-2xl border border-violet-800/30 bg-[#0d0d14] p-6">
          <div className="mb-4">
            <h3 className="font-bold text-violet-400">Import from Polymarket</h3>
            <p className="mt-0.5 text-xs text-slate-600">Search global prediction markets and click Import to pre-fill the create form. Polymarket auto-verification is wired automatically.</p>
          </div>
          <PolymarketImport onImport={handleImport} />
        </div>
      )}

      {/* Create market form */}
      {showCreate && (
        <div id="create-market-form" className="mb-6 rounded-2xl border border-emerald-800/30 bg-[#0d0d18] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-emerald-400">Create New Market</h3>
            {prefill?.conditionId && (
              <span className="rounded-full border border-violet-800/50 bg-violet-900/20 px-3 py-1 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                🌐 Pre-filled from Polymarket
              </span>
            )}
          </div>
          <CreateMarketForm
            prefill={prefill}
            onCreated={() => { setShowCreate(false); setPrefill(undefined) }}
          />
        </div>
      )}

      {settleMarket && (
        <div className="mb-6 rounded-2xl border border-amber-800/30 bg-[#0d0d18] p-6">
          <h3 className="mb-1 font-bold text-amber-400">Settle Market</h3>
          <p className="mb-4 text-sm text-slate-500">{settleMarket.title}</p>
          <SettleMarketForm market={settleMarket} onDone={() => setSettleMarket(null)} />
        </div>
      )}

      {/* Markets list */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-[#1a1a28] text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <span>Market</span><span>Sides</span><span>Pool</span><span>Closes</span><span>Action</span>
        </div>
        {filtered.map((m, i) => {
          const verBadge = m.verification_type && m.verification_type !== 'manual'
            ? VER_BADGE[m.verification_type] : null
          return (
            <div key={m.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-[#111120] transition-colors ${i < filtered.length-1 ? 'border-b border-[#1a1a28]' : ''}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-200 line-clamp-1">{m.title}</p>
                  {verBadge && (
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${verBadge.color}`}>
                      {verBadge.icon} auto
                    </span>
                  )}
                </div>
                <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                  m.status === 'open' ? 'bg-emerald-900/40 text-emerald-400' :
                  m.status === 'settled' ? 'bg-slate-800 text-slate-400' :
                  'bg-amber-900/40 text-amber-400'
                }`}>{m.status}</span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                <span className="text-violet-400">{m.options[0]?.label ?? '—'}</span>
                <span className="mx-1 text-slate-600">vs</span>
                <span className="text-amber-400">{m.options[1]?.label ?? '—'}</span>
              </span>
              <span className="text-sm font-bold text-slate-300">UGX {Number(m.total_pool).toLocaleString()}</span>
              <span className="text-xs text-slate-600">
                {m.closes_at ? new Date(m.closes_at).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—'}
              </span>
              <div className="flex gap-2">
                {m.status === 'open' && (
                  <button
                    onClick={() => { setSettleMarket(m); setShowCreate(false) }}
                    className="rounded-lg border border-amber-800/50 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/20 transition-colors"
                  >
                    Settle
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-600">No markets found.</div>
        )}
      </div>
    </div>
  )
}
