import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/server'

interface UpDownMarket {
  id: string
  title: string
  status: string
  total_pool: number
  closes_at: string | null
  metadata: Record<string, unknown>
  options: Array<{ id: string; label: string; total_pool: number }>
}

function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

function fmtPrice(n: number) {
  if (n >= 1_000_000) return n.toLocaleString()
  return n.toLocaleString()
}

const ASSET_ICON: Record<string, string> = {
  BTC: '₿',
  Bitcoin: '₿',
  Gold: '🥇',
  ETH: 'Ξ',
  Ethereum: 'Ξ',
}

function assetIcon(asset: string) {
  return ASSET_ICON[asset] ?? '📊'
}

export const revalidate = 60

export default async function UpDownPage() {
  const supabase = createPublicClient()

  const [{ data: updownData }, { data: priceData }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, title, status, total_pool, closes_at, metadata, options')
      .eq('status', 'open')
      .eq('metadata->>type', 'updown')
      .order('created_at', { ascending: false }),
    supabase
      .from('markets')
      .select('id, title, status, total_pool, closes_at, metadata, options')
      .eq('status', 'open')
      .eq('metadata->>type', 'price_level')
      .order('created_at', { ascending: false }),
  ])

  const markets = [
    ...(updownData ?? []),
    ...(priceData ?? []),
  ] as UpDownMarket[]

  return (
    <div className="min-h-screen bg-mk-bg">
      {/* Header */}
      <div className="border-b border-mk-border bg-mk-card px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">Price Action</p>
          <h1 className="text-4xl font-black text-white">Up/Down Markets</h1>
          <p className="mt-2 text-mk-muted">
            Predict whether Bitcoin, Gold, or other assets will move up or down — or hit a target price.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {markets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-mk-border bg-mk-card py-20 text-center">
            <p className="text-4xl">📊</p>
            <p className="mt-4 font-semibold text-slate-400">No open price markets right now.</p>
            <p className="mt-1 text-sm text-mk-muted">Check back soon — new markets open regularly.</p>
            <Link
              href="/markets"
              className="mt-6 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Browse all markets →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {markets.map(m => {
              const meta = m.metadata
              const type = meta.type as string
              const asset = (meta.asset as string) ?? 'Asset'
              const isUpDown = type === 'updown'
              const entryPrice = meta.entry_price as number | undefined
              const targetPrice = meta.target_price as number | undefined
              const direction = meta.direction as string | undefined
              const windowLabel = meta.window_label as string | undefined

              const closedMs = m.closes_at ? new Date(m.closes_at).getTime() - Date.now() : null
              const closeHours = closedMs !== null ? Math.floor(closedMs / 3600000) : null
              const closeMins = closedMs !== null ? Math.floor((closedMs % 3600000) / 60000) : null
              const closeLabel = closeHours !== null && closedMs !== null
                ? closedMs <= 0 ? 'Closing'
                : closeHours > 0 ? `${closeHours}h ${closeMins}m left`
                : `${closeMins}m left`
                : null
              const closeSoon = closedMs !== null && closedMs < 86_400_000 && closedMs > 0

              return (
                <Link
                  key={m.id}
                  href={`/markets/${m.id}`}
                  className="group block rounded-2xl border border-mk-border bg-mk-card p-5 transition-all hover:border-violet-600/40 hover:bg-mk-raised"
                >
                  <div className="flex items-start gap-4">
                    {/* Asset icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-900/20 border border-violet-800/30 text-xl font-black text-violet-300">
                      {assetIcon(asset)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isUpDown
                            ? 'bg-sky-900/30 border border-sky-800/40 text-sky-400'
                            : 'bg-violet-900/30 border border-violet-800/40 text-violet-400'
                        }`}>
                          {isUpDown ? '⬆⬇ Up/Down' : '🎯 Price Level'}
                        </span>
                        <span className="text-[10px] font-bold text-mk-muted">{asset}</span>
                        {closeLabel && (
                          <span className={`text-[10px] font-semibold ${closeSoon ? 'text-red-400' : 'text-mk-muted'}`}>
                            ⏱ {closeLabel}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="font-bold text-slate-100 leading-snug group-hover:text-white transition-colors">
                        {m.title}
                      </p>

                      {/* Price info */}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-mk-muted">
                        {isUpDown && entryPrice !== undefined && (
                          <span>
                            Entry:{' '}
                            <span className="font-semibold text-slate-300">${fmtPrice(entryPrice)}</span>
                          </span>
                        )}
                        {!isUpDown && targetPrice !== undefined && (
                          <span>
                            Target:{' '}
                            <span className="font-semibold text-violet-300">
                              {direction === 'above' ? '↑' : direction === 'below' ? '↓' : ''} ${fmtPrice(targetPrice)}
                            </span>
                          </span>
                        )}
                        {isUpDown && windowLabel && (
                          <span>Window: <span className="font-semibold text-slate-300">{windowLabel}</span></span>
                        )}
                        <span>Pool: <span className="font-semibold text-slate-300">{fmtPool(Number(m.total_pool))}</span></span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 self-center">
                      <span className="rounded-xl bg-violet-600/20 border border-violet-600/30 px-3 py-2 text-xs font-bold text-violet-300 group-hover:bg-violet-600 group-hover:text-white transition-all">
                        Predict →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
