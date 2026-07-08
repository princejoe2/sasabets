import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180, display: 'flex', flexDirection: 'column',
        alignItems: 'stretch', position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, #061a0e, #040c06)',
        borderRadius: 40, overflow: 'hidden',
      }}>
        {/* SABULA label strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'absolute', top: 10, left: 10, right: 10, height: 36,
          borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
        }}>
          <span style={{ color: 'white', fontFamily: 'sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: 8 }}>
            SABULA
          </span>
        </div>

        {/* Bar 1 — shortest */}
        <div style={{ position: 'absolute', bottom: 36, left: 22, width: 24, height: 34, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#003322 100%)' }} />
        {/* Bar 2 — medium */}
        <div style={{ position: 'absolute', bottom: 36, left: 60, width: 24, height: 56, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#005533 100%)' }} />
        {/* Bar 3 — tallest */}
        <div style={{ position: 'absolute', bottom: 36, left: 98, width: 24, height: 76, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#009944 100%)' }} />

        {/* Yellow trend line approximated */}
        <div style={{ position: 'absolute', left: 34, bottom: 66, width: 100, height: 2.5, background: '#f5c518', transform: 'rotate(-33deg)', transformOrigin: 'left center', opacity: 0.93 }} />
        {/* Dot at tip */}
        <div style={{ position: 'absolute', left: 120, top: 60, width: 10, height: 10, borderRadius: 5, background: '#f5c518', opacity: 0.9 }} />

        {/* 256 box */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'absolute', bottom: 8, left: 10, right: 10, height: 26,
          borderRadius: 8, background: 'linear-gradient(135deg,#00ff88,#00cc66)',
        }}>
          <span style={{ color: '#040c06', fontFamily: 'monospace', fontWeight: 900, fontSize: 18, letterSpacing: 3 }}>
            256
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
