import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Sabula 256 – Uganda Prediction Markets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          borderRadius: '50%', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
        }} />

        {/* Logo circle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 110, height: 110, borderRadius: 28,
          background: 'linear-gradient(135deg, #7c3aed, #4f1b8f)',
          fontSize: 56, fontWeight: 900, color: 'white',
          marginBottom: 32, boxShadow: '0 0 60px rgba(124,58,237,0.6)',
        }}>
          S
        </div>

        {/* Title */}
        <div style={{
          display: 'flex', fontSize: 72, fontWeight: 900,
          color: 'white', letterSpacing: '-2px', marginBottom: 16,
        }}>
          <span style={{ color: '#a78bfa' }}>Sabula</span>
          <span style={{ marginLeft: 16 }}>256</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 28, color: '#94a3b8', fontWeight: 500,
          textAlign: 'center', maxWidth: 700,
        }}>
          East Africa&apos;s Prediction Market
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          {['🏛️ Uganda Politics', '⚽ World Cup 2026', '📈 Crypto'].map(t => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 24px', borderRadius: 50,
              background: 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(124,58,237,0.4)',
              color: '#c4b5fd', fontSize: 20, fontWeight: 600,
            }}>
              {t}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div style={{
          position: 'absolute', bottom: 36,
          color: '#4c1d95', fontSize: 20, fontWeight: 700,
        }}>
          sabula256.com
        </div>
      </div>
    ),
    { ...size }
  )
}
