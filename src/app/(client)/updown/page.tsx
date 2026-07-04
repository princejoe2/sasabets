import { createClient, createAdminClient } from '@/lib/supabase/server'
import { settleMarket } from '@/lib/settle-market'
import UpDownClient from './UpDownClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Up/Down Markets – Crypto & Forex Predictions',
  description: 'Predict whether Bitcoin, Ethereum or the UGX exchange rate goes Up or Down. Fast-close prediction markets on Sabula 256. Win via MTN or Airtel Mobile Money.',
  openGraph: {
    title: 'Up/Down Markets | Sabula 256',
    description: 'Predict crypto and forex direction. Fast-close prediction markets paying out via Mobile Money.',
    url: 'https://sabula256.com/updown',
  },
}

export const revalidate = 30

const ASSETS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple']

async function getLivePrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ASSETS.join(',')}&vs_currencies=usd`,
      { next: { revalidate: 30 } }
    )
    const data = await res.json()
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as { usd: number }).usd]))
  } catch {
    return {}
  }
}

// Settle any expired updown markets immediately so users always see current state,
// rather than waiting for the daily cron.
async function autoSettle() {
  try {
    const admin = createAdminClient()
    const { data: expired } = await admin
      .from('markets')
      .select('id, metadata, options')
      .eq('status', 'open')
      .lt('closes_at', new Date().toISOString())

    const updownExpired = (expired ?? []).filter(
      m => (m.metadata as Record<string, unknown>)?.type === 'updown'
    )
    if (updownExpired.length === 0) return

    const assetSet = new Set(updownExpired.map(m => String((m.metadata as Record<string, unknown>).asset)))
    const assetIds = Array.from(assetSet)
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetIds.join(',')}&vs_currencies=usd`)
    const priceData = await r.json()
    const prices: Record<string, number> = Object.fromEntries(
      Object.entries(priceData).map(([k, v]) => [k, (v as { usd: number }).usd])
    )

    for (const market of updownExpired) {
      const meta       = market.metadata as Record<string, unknown>
      const assetId    = String(meta.asset)
      const entryPrice = Number(meta.entry_price ?? 0)
      const current    = prices[assetId]
      if (!current || !entryPrice) continue

      const opts    = market.options as Array<{ id: string; label: string }>
      const upOpt   = opts.find(o => o.id === 'opt-up')
      const downOpt = opts.find(o => o.id === 'opt-down')
      if (!upOpt || !downOpt) continue

      const winningOptionId = current > entryPrice ? upOpt.id : downOpt.id
      await settleMarket(admin, market.id, winningOptionId)
    }
  } catch (err) {
    console.error('[autoSettle]', err)
  }
}

export default async function UpDownPage() {
  const supabase = await createClient()

  const [{ data: markets }, prices] = await Promise.all([
    autoSettle().then(() =>
      supabase
        .from('markets')
        .select('id, title, description, total_pool, options, closes_at, status, rake_pct, metadata')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    getLivePrices(),
  ])

  const updownMarkets = (markets ?? []).filter(
    m => (m.metadata as Record<string, unknown>)?.type === 'updown'
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-emerald-500">Crypto Markets</p>
          <h1 className="text-4xl font-black text-white">Up / Down</h1>
          <p className="mt-3 text-slate-400 max-w-xl">
            Predict whether a crypto asset will be higher or lower than its current price when the market closes. Fast, simple, binary.
          </p>

          {/* Live prices */}
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { id: 'bitcoin',     sym: 'BTC', icon: '₿' },
              { id: 'ethereum',    sym: 'ETH', icon: 'Ξ' },
              { id: 'solana',      sym: 'SOL', icon: '◎' },
              { id: 'binancecoin', sym: 'BNB', icon: '⬡' },
              { id: 'ripple',      sym: 'XRP', icon: '✕' },
            ].map(a => prices[a.id] ? (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-2.5">
                <span className="text-slate-500 text-sm font-bold">{a.sym}</span>
                <span className="text-white font-black tabular-nums text-sm">${prices[a.id].toLocaleString()}</span>
              </div>
            ) : null)}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              live · CoinGecko
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <UpDownClient markets={updownMarkets} prices={prices} />
      </div>
    </div>
  )
}
