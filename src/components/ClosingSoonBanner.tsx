'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ClosingMarket = {
  id: string
  title: string
  closes_at: string
  minutesLeft: number
}

export default function ClosingSoonBanner() {
  const supabase = createClient()
  const [markets, setMarkets] = useState<ClosingMarket[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find markets closing in next 2 hours where user has active bets
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()

      const { data: bets } = await supabase
        .from('bets')
        .select('market_id, markets!inner(id, title, closes_at, status)')
        .eq('user_id', user.id)
        .eq('markets.status', 'open')
        .gte('markets.closes_at', now)
        .lte('markets.closes_at', twoHoursFromNow)
        .in('status', ['active', 'pending'])

      if (!bets || bets.length === 0) return

      // Deduplicate by market
      const seen = new Set<string>()
      const closing: ClosingMarket[] = []
      for (const bet of bets) {
        const m = bet.markets as any
        if (!m || seen.has(m.id)) continue
        seen.add(m.id)
        const minutesLeft = Math.round((new Date(m.closes_at).getTime() - Date.now()) / 60000)
        closing.push({ id: m.id, title: m.title, closes_at: m.closes_at, minutesLeft })
      }

      // Filter out dismissed ones (stored in sessionStorage)
      const dismissedRaw = sessionStorage.getItem('closing-dismissed') ?? '[]'
      const dismissedIds = new Set<string>(JSON.parse(dismissedRaw))
      setDismissed(dismissedIds)
      setMarkets(closing.filter(m => !dismissedIds.has(m.id)))
    }
    check()
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    sessionStorage.setItem('closing-dismissed', JSON.stringify(Array.from(next)))
    setMarkets(prev => prev.filter(m => m.id !== id))
  }

  if (markets.length === 0) return null

  return (
    <div className="space-y-2 px-4 pt-3">
      {markets.map(m => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30"
        >
          <span className="text-xl shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-900 dark:text-red-200 truncate">
              Closing in {m.minutesLeft < 60 ? `${m.minutesLeft}m` : `${Math.round(m.minutesLeft/60)}h`}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 truncate">{m.title}</p>
          </div>
          <Link
            href={`/markets/${m.id}`}
            className="shrink-0 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
          >
            View
          </Link>
          <button
            onClick={() => dismiss(m.id)}
            className="shrink-0 text-red-300 hover:text-red-500 dark:text-red-700 dark:hover:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
