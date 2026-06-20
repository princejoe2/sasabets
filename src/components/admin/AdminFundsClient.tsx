'use client'
import { useState } from 'react'

interface WalletRow { user_id: string; balance: number; phone: string; name: string | null }

export default function AdminFundsClient({ wallets }: { wallets: WalletRow[] }) {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function adjustFunds(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || !amount) return
    setLoading(true); setMsg('')
    const res = await fetch('/api/admin/adjust-funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g,''), amount: parseFloat(amount), note }),
    })
    const data = await res.json()
    setMsg(res.ok ? `Done. New balance: UGX ${data.newBalance?.toLocaleString()}` : data.error ?? 'Failed')
    if (res.ok) { setPhone(''); setAmount(''); setNote('') }
    setLoading(false)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Manual adjustment */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-6">
        <h2 className="mb-1 font-black text-slate-200">Manual Fund Adjustment</h2>
        <p className="mb-5 text-xs text-slate-500">Add or deduct from any user wallet. Use positive for credit, negative for debit.</p>
        <form onSubmit={adjustFunds} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">User Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 256700000000"
              className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Amount (UGX) — negative to deduct</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10000 or -5000"
              className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Note (internal)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for adjustment"
              className="w-full rounded-xl border border-[#1a1a28] bg-[#08080e] px-4 py-3 text-sm outline-none focus:border-red-700 transition-colors" />
          </div>
          {msg && <p className={`text-sm ${msg.startsWith('Done') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
          <button type="submit" disabled={loading || !phone || !amount}
            className="w-full rounded-xl bg-red-700 py-3 text-sm font-black hover:bg-red-600 disabled:opacity-40 transition-colors">
            {loading ? 'Processing…' : 'Apply Adjustment'}
          </button>
        </form>
      </div>

      {/* User wallet balances */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a28]">
          <h2 className="font-black text-slate-200">User Wallets</h2>
          <p className="text-xs text-slate-600 mt-0.5">Sorted by balance</p>
        </div>
        <div className="overflow-y-auto max-h-96">
          {wallets.map((w, i) => (
            <div key={w.user_id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#111120] transition-colors ${i < wallets.length-1 ? 'border-b border-[#1a1a28]' : ''}`}>
              <div>
                <p className="text-sm font-mono text-slate-300">+{w.phone}</p>
                {w.name && <p className="text-xs text-slate-600">{w.name}</p>}
              </div>
              <p className={`text-sm font-black ${Number(w.balance) > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                UGX {Number(w.balance).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
