'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
}

const THRESHOLD  = 70   // px drag distance to trigger
const RESISTANCE = 2.2  // feel factor — higher = harder to pull

// Five bar colours cycling through the candidate palette
const BAR_COLORS = [
  'var(--mk-c0)', 'var(--mk-c1)', 'var(--mk-c2)', 'var(--mk-c3)', 'var(--mk-c4)',
]

export default function PullToRefresh({ onRefresh, children, disabled }: Props) {
  const [pullY,   setPullY]   = useState(0)
  const [loading, setLoading] = useState(false)
  const startYRef  = useRef(0)
  const pullingRef = useRef(false)
  const loadingRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || loadingRef.current) return
    const scrollTop = document.documentElement.scrollTop + document.body.scrollTop
    if (scrollTop > 4) return            // only trigger when already at top
    startYRef.current  = e.touches[0].clientY
    pullingRef.current = true
  }, [disabled])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current || loadingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) { pullingRef.current = false; return }
    e.preventDefault()
    setPullY(Math.min(delta / RESISTANCE, THRESHOLD * 1.4))
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false
    const triggered = pullY >= THRESHOLD / RESISTANCE * 0.85
    if (triggered && !loadingRef.current) {
      loadingRef.current = true
      setLoading(true)
      setPullY(THRESHOLD / RESISTANCE * 0.85)
      try { await onRefresh() } finally {
        loadingRef.current = false
        setLoading(false)
        setPullY(0)
      }
    } else {
      setPullY(0)
    }
  }, [pullY, onRefresh])

  useEffect(() => {
    const el = document.documentElement
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    el.addEventListener('touchend',   handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove',  handleTouchMove)
      el.removeEventListener('touchend',   handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const visible = loading || pullY > 2
  const progress = Math.min(pullY / (THRESHOLD / RESISTANCE * 0.85), 1)

  return (
    <div style={{ overscrollBehaviorY: 'contain' }}>
      {/* Pill indicator */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-toast pointer-events-none"
        style={{
          top: `calc(56px + env(safe-area-inset-top) + ${Math.min(pullY * 0.6, 28)}px)`,
          opacity: visible ? 1 : 0,
          transform: `translateX(-50%) scale(${visible ? 1 : 0.5})`,
          transition: loading ? undefined : 'opacity 0.2s, transform 0.2s',
        }}
      >
        <div
          className="flex items-center gap-[3px] rounded-r-pill border border-mk-border px-4 py-2 shadow-lg"
          style={{ background: 'var(--mk-raised)' }}
        >
          {BAR_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full"
              style={{
                background: color,
                height: loading ? '12px' : `${Math.round(4 + progress * 10)}px`,
                animation: loading
                  ? `barFlash 0.55s ease-in-out ${i * 0.09}s infinite`
                  : undefined,
                transition: loading ? undefined : 'height 0.1s ease-out',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content — nudges down slightly while pulling */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${Math.min(pullY * 0.35, 18)}px)` : undefined,
          transition: !pullingRef.current ? 'transform 0.3s var(--ease-out)' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
