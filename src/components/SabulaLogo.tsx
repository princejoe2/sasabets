'use client'
import React, { useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Navbar logo — two CSS-class-driven versions so dark mode
   works immediately without a JS hydration delay.
───────────────────────────────────────────────────────────── */
export function SabulaNavLogo() {
  return (
    <>
      {/* ── Dark mode ── */}
      <span className="hidden dark:flex items-baseline gap-0.5 select-none">
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 38,
          letterSpacing: 5,
          lineHeight: 1,
          color: '#ffffff',
          textShadow: '0 0 12px rgba(245,197,24,0.9), 0 0 32px rgba(245,197,24,0.5), 0 0 64px rgba(245,197,24,0.2)',
        }}>
          SABULA
        </span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 22,
          fontWeight: 900,
          color: '#00ff88',
          textShadow: '0 0 12px #00ff88, 0 0 32px rgba(0,255,136,0.7), 0 0 64px rgba(0,255,136,0.3)',
          letterSpacing: 2,
          lineHeight: 1,
        }}>
          256
        </span>
      </span>

      {/* ── Light mode ── */}
      <span className="flex dark:hidden items-baseline gap-0.5 select-none">
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 38,
          letterSpacing: 5,
          lineHeight: 1,
          color: '#0f0f1a',
          textShadow: '0 0 10px rgba(245,197,24,0.6), 0 2px 0 rgba(0,0,0,0.15)',
        }}>
          SABULA
        </span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 22,
          fontWeight: 900,
          color: '#007a40',
          textShadow: '0 0 8px rgba(0,122,64,0.5), 0 0 20px rgba(0,122,64,0.25)',
          letterSpacing: 2,
          lineHeight: 1,
        }}>
          256
        </span>
      </span>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Background watermark — huge faded logo, positioned absolute
   behind hero content. Also dual-mode via Tailwind classes.
───────────────────────────────────────────────────────────── */
export function SabulaWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden z-0"
    >
      {/* Dark mode watermark */}
      <span
        className="hidden dark:block"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(100px, 20vw, 260px)',
          letterSpacing: '18px',
          lineHeight: 0.9,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.07)',
          textShadow: '0 0 80px rgba(245,197,24,0.06)',
        }}
      >
        SABULA
      </span>
      <span
        className="hidden dark:block"
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 'clamp(50px, 10vw, 130px)',
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(0,255,136,0.08)',
          letterSpacing: '8px',
          lineHeight: 1,
          marginTop: '-6px',
        }}
      >
        256
      </span>

      {/* Light mode watermark */}
      <span
        className="block dark:hidden"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(100px, 20vw, 260px)',
          letterSpacing: '18px',
          lineHeight: 0.9,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(15,15,26,0.08)',
          textShadow: '0 0 60px rgba(245,197,24,0.05)',
        }}
      >
        SABULA
      </span>
      <span
        className="block dark:hidden"
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 'clamp(50px, 10vw, 130px)',
          fontWeight: 900,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(0,100,50,0.09)',
          letterSpacing: '8px',
          lineHeight: 1,
          marginTop: '-6px',
        }}
      >
        256
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Full hero logo — always on dark background (#040c06),
   used on mobile homepage for logged-in users.
───────────────────────────────────────────────────────────── */
export default function SabulaLogoHero({ onClick }: { onClick?: () => void }) {
  const [busy, setBusy] = useState(false)

  function handleClick() {
    if (busy) return
    setBusy(true)

    const overlay = document.getElementById('logo-win-overlay')
    if (overlay) {
      overlay.style.opacity = '1'
      setTimeout(() => { overlay.style.opacity = '0' }, 350)
    }

    const num = document.getElementById('logo-num256')
    if (num) {
      const frames = ['???', '...', String(Math.floor(Math.random() * 900 + 100)), '256']
      let i = 0
      const tick = setInterval(() => {
        num.textContent = frames[i++]
        if (i >= frames.length) { clearInterval(tick); num.textContent = '256' }
      }, 160)
    }

    setTimeout(() => setBusy(false), 1200)
  }

  return (
    <div style={{
      width: '100%',
      background: '#040c06',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Rajdhani', sans-serif",
      padding: '60px 16px 40px',
    }}>
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,136,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.035) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
      {/* Radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(245,197,24,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Corner marks */}
      {([
        { top: 28, left: 28, borderTop: '1px solid rgba(245,197,24,0.5)', borderLeft: '1px solid rgba(245,197,24,0.5)' },
        { top: 28, right: 28, borderTop: '1px solid rgba(245,197,24,0.5)', borderRight: '1px solid rgba(245,197,24,0.5)' },
        { bottom: 44, left: 28, borderBottom: '1px solid rgba(245,197,24,0.5)', borderLeft: '1px solid rgba(245,197,24,0.5)' },
        { bottom: 44, right: 28, borderBottom: '1px solid rgba(245,197,24,0.5)', borderRight: '1px solid rgba(245,197,24,0.5)' },
      ] as React.CSSProperties[]).map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 50, height: 50, ...s }} />
      ))}

      <div
        onClick={onClick ?? handleClick}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 2, animation: 'sabula-float 5s ease-in-out infinite' }}
      >
        {/* PREDICT label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ height: 1, width: 44, background: 'linear-gradient(90deg, transparent, #f5c518)' }} />
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 7, color: '#f5c518' }}>PREDICT</span>
          <div style={{ height: 1, width: 44, background: 'linear-gradient(90deg, #f5c518, transparent)' }} />
        </div>

        {/* SABULA */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(78px, 13vw, 138px)',
          letterSpacing: 14,
          lineHeight: 0.88,
          color: '#ffffff',
          textShadow: '0 0 16px rgba(245,197,24,0.9), 0 0 48px rgba(245,197,24,0.5), 0 0 100px rgba(245,197,24,0.2)',
          animation: 'sabula-pulse 3.5s ease-in-out infinite',
        }}>
          SABULA
        </div>

        {/* 256 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: -6 }}>
          <span
            id="logo-num256"
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 'clamp(40px, 6.5vw, 70px)',
              fontWeight: 900,
              color: '#00ff88',
              textShadow: '0 0 14px #00ff88, 0 0 40px rgba(0,255,136,0.7), 0 0 80px rgba(0,255,136,0.3)',
              letterSpacing: 3,
              animation: 'sabula-neon 2.8s ease-in-out infinite',
            }}
          >
            256
          </span>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(16px, 2.5vw, 26px)', fontWeight: 600, color: 'rgba(0,255,136,0.5)', letterSpacing: 1 }}>.com</span>
        </div>

        {/* Probability bar */}
        <div style={{ marginTop: 18, width: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#00ff88' }}>YES</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>MARKET ODDS</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#ff3366' }}>NO</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,51,102,0.25)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '68%', background: 'linear-gradient(90deg, #00ff88, #00cc66)', borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(0,255,136,0.6)', fontWeight: 600 }}>68%</span>
            <span style={{ fontSize: 10, color: 'rgba(255,51,102,0.6)', fontWeight: 600 }}>32%</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 1, width: 28, background: 'rgba(245,197,24,0.4)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Uganda&apos;s Prediction Market</span>
          <div style={{ height: 1, width: 28, background: 'rgba(245,197,24,0.4)' }} />
        </div>
      </div>

      <div id="logo-win-overlay" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.25), transparent 65%)', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s' }} />

      <style>{`
        @keyframes sabula-pulse {
          0%, 100% { text-shadow: 0 0 16px rgba(245,197,24,0.9), 0 0 48px rgba(245,197,24,0.5), 0 0 100px rgba(245,197,24,0.2); }
          50%       { text-shadow: 0 0 28px #f5c518, 0 0 80px rgba(245,197,24,0.7), 0 0 160px rgba(245,197,24,0.3); }
        }
        @keyframes sabula-neon {
          0%, 100% { text-shadow: 0 0 14px #00ff88, 0 0 40px rgba(0,255,136,0.7), 0 0 80px rgba(0,255,136,0.3); }
          50%       { text-shadow: 0 0 24px #00ff88, 0 0 70px rgba(0,255,136,0.9), 0 0 140px rgba(0,255,136,0.4); }
        }
        @keyframes sabula-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
