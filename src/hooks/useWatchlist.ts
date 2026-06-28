import { useState, useEffect, useCallback } from 'react'

const KEY = 'sabula-watchlist'

export function useWatchlist() {
  const [watched, setWatched] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setWatched(new Set(JSON.parse(raw) as string[]))
    } catch {}
    setLoaded(true)
  }, [])

  const toggle = useCallback((id: string) => {
    setWatched(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(KEY, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }, [])

  const isWatched = useCallback((id: string) => watched.has(id), [watched])

  return { watched, toggle, isWatched, loaded }
}
