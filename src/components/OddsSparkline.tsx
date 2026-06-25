'use client'
import { useEffect, useRef, useState } from 'react'

const W = 120
const H = 40
const PAD = 3

function buildPath(values: number[]): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = W - PAD * 2
  const innerH = H - PAD * 2

  return values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * innerW
      const y = PAD + ((max - v) / range) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export default function OddsSparkline({ marketId }: { marketId: string }) {
  const [values, setValues] = useState<number[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded.current) {
          loaded.current = true
          fetch(`/api/market/${marketId}/chart`)
            .then(r => r.json())
            .then(d => {
              const pts: { pA: number }[] = d.points ?? []
              setValues(pts.map(p => p.pA))
            })
            .catch(() => {})
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [marketId])

  const linePath = buildPath(values)
  const current = values[values.length - 1] ?? 50
  const start = values[0] ?? 50
  const trending = current >= start
  const color = current > 52 ? '#a78bfa' : current < 48 ? '#fbbf24' : '#64748b'

  if (values.length < 2) {
    return <div ref={ref} className="h-10 w-[120px]" />
  }

  const lastIdx = values.length - 1
  const lastX = PAD + (lastIdx / lastIdx) * (W - PAD * 2)
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const lastY = PAD + ((max - current) / range) * (H - PAD * 2)

  return (
    <div ref={ref} className="flex items-center gap-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <circle cx={lastX} cy={lastY} r="3" fill={color} stroke="#111118" strokeWidth="1.5" />
      </svg>
      <span
        className="text-[10px] font-black tabular-nums"
        style={{ color, minWidth: '2.5rem' }}
      >
        {current.toFixed(0)}%
        <span className="text-[9px] font-normal ml-0.5">{trending ? '↑' : '↓'}</span>
      </span>
    </div>
  )
}
