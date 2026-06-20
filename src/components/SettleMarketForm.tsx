'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Market {
  id: string
  title: string
  options: Array<{ id: string; label: string; total_pool: number }>
}

export default function SettleMarketForm({ market, onDone }: { market: Market; onDone: () => void }) {
  const router = useRouter()
  const [winner, setWinner] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSettle() {
    if (!winner) { setError('Select a winning option'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: market.id, winningOptionId: winner }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed')
    else { onDone(); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-emerald-800 bg-[#13131a] p-6 space-y-4">
      <h3 className="font-semibold text-emerald-400">Settle: {market.title}</h3>
      <p className="text-xs text-slate-500">Select the winning outcome. Payouts will be distributed automatically.</p>
      <div className="space-y-2">
        {market.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => setWinner(opt.id)}
            className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
              winner === opt.id
                ? 'border-emerald-600 bg-emerald-900/30 text-white'
                : 'border-[#1e1e2e] text-slate-300 hover:border-emerald-800'
            }`}
          >
            {opt.label} — UGX {Number(opt.total_pool).toLocaleString()}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSettle}
          disabled={loading || !winner}
          className="flex-1 rounded-lg bg-emerald-700 py-2.5 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Settling...' : 'Confirm & Settle'}
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-[#1e1e2e] px-4 py-2.5 text-sm hover:bg-[#1e1e2e] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
