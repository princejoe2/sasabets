'use client'
import { useEffect, useState } from 'react'

interface Snap { snapshot_at: string; total_pool: number }

export default function PoolDepthSparkline({ marketId }: { marketId: string }) {
  const [snaps, setSnaps] = useState<Snap[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/market/${marketId}/depth-history`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.snapshots) setSnaps(d.snapshots) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [marketId])

  if (snaps.length < 2) return null

  const pools = snaps.map(s => Number(s.total_pool))
  const min = Math.min(...pools)
  const max = Math.max(...pools)
  const range = max - min || 1

  const W = 60; const H = 18
  const pts = pools.map((v, i) => {
    const x = (i / (pools.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} className="opacity-60" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="#4ade80"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
