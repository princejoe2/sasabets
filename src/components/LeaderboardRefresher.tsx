'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Invisible client component that calls router.refresh() on an interval so the
 * leaderboard server component re-fetches fresh data without a full page reload.
 */
export function LeaderboardRefresher({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
