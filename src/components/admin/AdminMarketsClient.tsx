'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateMarketForm, { type EditMarket } from '@/components/CreateMarketForm'
import SettleMarketForm from '@/components/SettleMarketForm'
import PolymarketImport from '@/components/admin/PolymarketImport'
import KalshiImport from '@/components/admin/KalshiImport'
import PoolDepthSparkline from '@/components/admin/PoolDepthSparkline'

interface Market {
  id: string; title: string; status: string; total_pool: number;
  options: Array<{ id: string; label: string; total_pool: number }>;
  closes_at: string | null; created_at: string; rake_pct: number;
  verification_type?: string; verification_config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  description?: string | null;
  surge_flag?: boolean;
  is_featured?: boolean;
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
  const [clearingSurge,  setClearingSurge]  = useState<string | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [deleteError,    setDeleteError]    = useState<string | null>(null)
  const [featureConfirm, setFeatureConfirm] = useState<string | null>(null)   // market.id pending feature action
  const [featuring,      setFeaturing]      = useState<string | null>(null)
  const [featureMsg,     setFeatureMsg]     = useState<{ id: string; text: string; ok: boolean } | null>(null)

  async function featureMarket(marketId: string, featured: boolean, broadcast: boolean) {
    setFeaturing(marketId)
    setFeatureConfirm(null)
    const res  = await fetch(`/api/admin/market/${marketId}/feature`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured, broadcast }),
    })
    const data = await res.json()
    if (!res.ok) {
      setFeatureMsg({ id: marketId, text: data.error ?? 'Failed', ok: false })
    } else {
      const bc = data.broadcast
      const bcText = bc
        ? bc.error
          ? ` (broadcast error: ${bc.error})`
          : ` · Broadcast: ${bc.sent}/${bc.recipientCount} sent`
        : ''
      setFeatureMsg({ id: marketId, text: featured ? `Featured${bcText}` : 'Unpinned', ok: true })
      router.refresh()
    }
    setFeaturing(null)
  }

  async function clearSurge(marketId: string) {
    setClearingSurge(marketId)
    await fetch(`/api/admin/market/${marketId}/clear-surge`, { method: 'POST' })
    setClearingSurge(null)
    router.refresh()
  }

  async function deleteMarket(marketId: string) {
    setDeleting(marketId); setDeleteError(null)
    const res  = await fetch(`/api/admin/market/${marketId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setConfirmDelete(null)
      router.refresh()
    } else {
      setDeleteError(data.error ?? 'Failed to delete')
    }
    setDeleting(null)
  }

  const [showCreate,     setShowCreate]     = useState(false)
  const [showPolyImport, setShowPolyImport] = useState(false)
  const [importSource,   setImportSource]   = useState<'polymarket' | 'kalshi'>('polymarket')
  const [prefill,        setPrefill]        = useState<Prefill | undefined>()
  const [settleMarket,   setSettleMarket]   = useState<Market | null>(null)
  const [editingMarket,  setEditingMarket]  = useState<EditMarket | null>(null)
  const [filter,         setFilter]         = useState<'all' | 'open' | 'closed' | 'settled' | 'suspended'>('all')

  // Auto-settle state
  const [autoRunning,  setAutoRunning]  = useState(false)
  const [autoResults,  setAutoResults]  = useState<{ settled: number; pending: number; results: AutoSettleResult[] } | null>(null)

  const filtered = markets.filter(m => filter === 'all' || m.status === filter)

  function handleImport(title: string, optA: string, optB: string, conditionId: string) {
    setPrefill({ title, optA, optB, conditionId })
    setShowCreate(true)
    setSettleMarket(null)
    setEditingMarket(null)
    setTimeout(() => document.getElementById('create-market-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function openEdit(m: Market) {
    setEditingMarket({
      id:                  m.id,
      title:               m.title,
      description:         m.description ?? null,
      closes_at:           m.closes_at,
      rake_pct:            m.rake_pct,
      options:             m.options,
      verification_type:   m.verification_type ?? 'manual',
      verification_config: m.verification_config ?? {},
      metadata:            m.metadata ?? {},
    })
    setShowCreate(false)
    setSettleMarket(null)
    setTimeout(() => document.getElementById('edit-market-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
          <button onClick={() => setFilter('suspended')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${filter === 'suspended' ? 'bg-red-700 text-white' : 'text-red-400/70 hover:text-red-300'}`}>
            🚨 suspended
          </button>
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
            {showPolyImport ? '✕ Close Import' : '🔍 Import Markets'}
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

      {/* Market import panel */}
      {showPolyImport && (
        <div className="mb-5 rounded-2xl border border-violet-800/30 bg-[#0d0d14] p-6">
          {/* Source tabs */}
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className={`font-bold ${importSource === 'polymarket' ? 'text-violet-400' : 'text-teal-400'}`}>
                Import from {importSource === 'polymarket' ? 'Polymarket' : 'Kalshi'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {importSource === 'polymarket'
                  ? 'Global prediction markets. Polymarket auto-verification is wired automatically.'
                  : 'US regulated prediction markets. Imported as manual-verification.'}
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-[#1e1e2e] bg-[#08080e] p-1">
              <button
                onClick={() => setImportSource('polymarket')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  importSource === 'polymarket'
                    ? 'bg-violet-900/50 text-violet-300 border border-violet-700/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🌐 Polymarket
              </button>
              <button
                onClick={() => setImportSource('kalshi')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  importSource === 'kalshi'
                    ? 'bg-teal-900/50 text-teal-300 border border-teal-700/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                🏛️ Kalshi
              </button>
            </div>
          </div>

          {importSource === 'polymarket' && <PolymarketImport onImport={handleImport} />}
          {importSource === 'kalshi'     && <KalshiImport     onImport={handleImport} />}
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

      {editingMarket && (
        <div id="edit-market-form" className="mb-6 rounded-2xl border border-violet-800/30 bg-[#0d0d18] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-violet-400">Edit Market</h3>
              <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{editingMarket.title}</p>
            </div>
            <button onClick={() => setEditingMarket(null)} className="text-slate-600 hover:text-slate-400 text-sm">✕</button>
          </div>
          <CreateMarketForm
            key={editingMarket.id}
            editMarket={editingMarket}
            onCreated={() => setEditingMarket(null)}
          />
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
            <div key={m.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors ${
              m.status === 'suspended'
                ? `bg-red-950/20 border-l-2 border-l-red-600 hover:bg-red-950/30 ${i < filtered.length-1 ? 'border-b border-[#1a1a28]' : ''}`
                : `hover:bg-[#111120] ${i < filtered.length-1 ? 'border-b border-[#1a1a28]' : ''}`
            }`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-200 line-clamp-1">{m.title}</p>
                  {verBadge && (
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${verBadge.color}`}>
                      {verBadge.icon} auto
                    </span>
                  )}
                  {m.surge_flag && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-900/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                      ⚡ SURGE
                    </span>
                  )}
                  {m.status === 'suspended' && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full border border-red-700/50 bg-red-900/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                      🚨 SUSPENDED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    m.status === 'open'      ? 'bg-emerald-900/40 text-emerald-400' :
                    m.status === 'suspended' ? 'bg-red-900/40 text-red-400' :
                    m.status === 'settled'   ? 'bg-slate-800 text-slate-400' :
                    'bg-amber-900/40 text-amber-400'
                  }`}>{m.status}</span>
                  <PoolDepthSparkline marketId={m.id} />
                </div>
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
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => openEdit(m)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    editingMarket?.id === m.id
                      ? 'border-violet-700 bg-violet-900/30 text-violet-300'
                      : 'border-violet-900/50 text-violet-500 hover:bg-violet-900/20'
                  }`}
                >
                  Edit
                </button>
                {(m.status === 'open' || m.status === 'closed') && (
                  <button
                    onClick={() => { setSettleMarket(m); setShowCreate(false); setEditingMarket(null) }}
                    className="rounded-lg border border-amber-800/50 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/20 transition-colors"
                  >
                    Settle
                  </button>
                )}
                {m.surge_flag && (
                  <button
                    onClick={() => clearSurge(m.id)}
                    disabled={clearingSurge === m.id}
                    className="rounded-lg border border-emerald-800/50 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900/20 disabled:opacity-40 transition-colors"
                  >
                    {clearingSurge === m.id ? '…' : 'Clear ⚡'}
                  </button>
                )}

                {/* Feature / Unpin / Broadcast */}
                {featureMsg?.id === m.id && (
                  <p className={`text-[10px] font-bold ${featureMsg.ok ? 'text-amber-400' : 'text-red-400'}`}>
                    {featureMsg.text}
                  </p>
                )}
                {m.is_featured ? (
                  <>
                    <button
                      onClick={() => featureMarket(m.id, false, false)}
                      disabled={featuring === m.id}
                      className="rounded-lg border border-amber-800/50 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/20 disabled:opacity-40 transition-colors"
                    >
                      {featuring === m.id ? '…' : 'Unpin 📌'}
                    </button>
                    <button
                      onClick={() => featureMarket(m.id, true, true)}
                      disabled={featuring === m.id}
                      className="rounded-lg border border-green-800/50 px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-900/20 disabled:opacity-40 transition-colors"
                    >
                      {featuring === m.id ? '…' : '📲 Broadcast'}
                    </button>
                  </>
                ) : m.status === 'open' && (
                  featureConfirm === m.id ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-amber-400 font-bold">Feature?</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => featureMarket(m.id, true, false)}
                          disabled={featuring === m.id}
                          className="rounded-lg bg-amber-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                        >
                          📌 Only
                        </button>
                        <button
                          onClick={() => featureMarket(m.id, true, true)}
                          disabled={featuring === m.id}
                          className="rounded-lg bg-green-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          +📲
                        </button>
                        <button
                          onClick={() => setFeatureConfirm(null)}
                          className="rounded-lg border border-[#2a2a3e] px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setFeatureConfirm(m.id)}
                      className="rounded-lg border border-amber-900/40 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-900/20 transition-colors"
                    >
                      📌 Feature
                    </button>
                  )
                )}

                {/* Delete — inline confirmation */}
                {confirmDelete === m.id ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-red-400 font-bold">Sure?</p>
                    {deleteError && confirmDelete === m.id && (
                      <p className="text-[10px] text-red-500 leading-tight">{deleteError}</p>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteMarket(m.id)}
                        disabled={deleting === m.id}
                        className="rounded-lg bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleting === m.id ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                        className="rounded-lg border border-[#2a2a3e] px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirmDelete(m.id); setDeleteError(null) }}
                    className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-900/20 transition-colors"
                  >
                    Delete
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
