'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RouteProgressBar() {
  const pathname  = usePathname()
  const prevRef   = useRef(pathname)
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([])
  const [pct,  setPct]  = useState(0)
  const [show, setShow] = useState(false)

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    clearAll()
    setPct(100)
    timers.current.push(setTimeout(() => { setShow(false); setPct(0) }, 350))
  }, [clearAll])

  // Listen for clicks on internal links → start bar
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return
      clearAll()
      setShow(true)
      setPct(15)
      timers.current.push(setTimeout(() => setPct(50), 180))
      timers.current.push(setTimeout(() => setPct(78), 700))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [clearAll])

  // Pathname changed → navigation complete → finish bar
  useEffect(() => {
    if (pathname !== prevRef.current) {
      prevRef.current = pathname
      if (show) finish()
    }
  }, [pathname, show, finish])

  useEffect(() => () => clearAll(), [clearAll])

  if (!show) return null
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 z-progress-bar pointer-events-none"
      style={{
        height: '2px',
        width: `${pct}%`,
        background: 'var(--mk-accent)',
        transition: pct === 100
          ? 'width 80ms ease-out, opacity 250ms ease 80ms'
          : 'width 600ms ease-out',
        opacity: pct === 100 ? 0 : 1,
        willChange: 'width',
      }}
    />
  )
}
