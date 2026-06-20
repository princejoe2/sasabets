'use client'
import { useEffect } from 'react'

export default function CursorEffects() {
  useEffect(() => {
    // ── Spotlight glow (large, slow) ──────────────────────────────
    const spotlight = document.createElement('div')
    Object.assign(spotlight.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '1',
      width: '700px',
      height: '700px',
      borderRadius: '50%',
      background: 'radial-gradient(circle at center, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.02) 40%, transparent 70%)',
      transform: 'translate(-50%, -50%)',
      left: '-700px',
      top: '-700px',
      transition: 'left 0.18s ease-out, top 0.18s ease-out',
    })
    document.body.appendChild(spotlight)

    // ── Cursor ring (medium, follows with small delay) ────────────
    const ring = document.createElement('div')
    Object.assign(ring.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9998',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: '1.5px solid rgba(167,139,250,0.5)',
      transform: 'translate(-50%, -50%)',
      left: '-100px',
      top: '-100px',
      transition: 'left 0.1s ease-out, top 0.1s ease-out, width 0.2s, height 0.2s, opacity 0.2s',
    })
    document.body.appendChild(ring)

    // ── Cursor dot (tiny, snappy) ─────────────────────────────────
    const dot = document.createElement('div')
    Object.assign(dot.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'rgba(167,139,250,0.9)',
      transform: 'translate(-50%, -50%)',
      left: '-20px',
      top: '-20px',
      transition: 'left 0.03s, top 0.03s',
    })
    document.body.appendChild(dot)

    let mouseX = -700, mouseY = -700

    function onMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      spotlight.style.left = mouseX + 'px'
      spotlight.style.top  = mouseY + 'px'
      ring.style.left = mouseX + 'px'
      ring.style.top  = mouseY + 'px'
      dot.style.left = mouseX + 'px'
      dot.style.top  = mouseY + 'px'
    }

    // Enlarge ring over interactive elements
    function onEnterInteractive() {
      ring.style.width = '56px'
      ring.style.height = '56px'
      ring.style.borderColor = 'rgba(167,139,250,0.8)'
      dot.style.opacity = '0.3'
    }
    function onLeaveInteractive() {
      ring.style.width = '36px'
      ring.style.height = '36px'
      ring.style.borderColor = 'rgba(167,139,250,0.5)'
      dot.style.opacity = '1'
    }

    const interactives = document.querySelectorAll('a, button, [role="button"], input, [class*="cursor-pointer"]')
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onEnterInteractive)
      el.addEventListener('mouseleave', onLeaveInteractive)
    })

    // Click ripple + burst
    function onClick(e: MouseEvent) {
      // Outer ring ripple
      const ripple = document.createElement('div')
      Object.assign(ripple.style, {
        position: 'fixed',
        pointerEvents: 'none',
        left: e.clientX + 'px',
        top: e.clientY + 'px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '1.5px solid rgba(167,139,250,0.7)',
        zIndex: '9997',
        animation: 'cursor-ripple 0.65s cubic-bezier(0.2,0.8,0.2,1) forwards',
      })
      document.body.appendChild(ripple)

      // Inner fill burst
      const burst = document.createElement('div')
      Object.assign(burst.style, {
        position: 'fixed',
        pointerEvents: 'none',
        left: e.clientX + 'px',
        top: e.clientY + 'px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(167,139,250,0.25)',
        zIndex: '9997',
        animation: 'cursor-burst 0.5s ease-out forwards',
      })
      document.body.appendChild(burst)

      // Shrink dot on click
      dot.style.transform = 'translate(-50%, -50%) scale(2)'
      dot.style.opacity = '0.5'
      setTimeout(() => {
        dot.style.transform = 'translate(-50%, -50%) scale(1)'
        dot.style.opacity = '1'
      }, 150)

      setTimeout(() => { ripple.remove(); burst.remove() }, 700)
    }

    // Hide when leaving window
    function onLeave() {
      ring.style.opacity = '0'
      dot.style.opacity = '0'
    }
    function onEnter() {
      ring.style.opacity = '1'
      dot.style.opacity = '1'
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', onEnterInteractive)
        el.removeEventListener('mouseleave', onLeaveInteractive)
      })
      spotlight.remove()
      ring.remove()
      dot.remove()
    }
  }, [])

  return null
}
