import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(155deg, #0d2818 0%, #061610 40%, #040c06 100%)',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -60,
          borderRadius: 60,
          background: 'rgba(245,197,24,0.07)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          width: 100,
          height: 80,
          marginLeft: -50,
          borderRadius: 50,
          background: 'rgba(0,255,136,0.06)',
        }} />

        {/* SABULA */}
        <div style={{
          display: 'flex',
          color: '#ffffff',
          fontFamily: '"Arial Black", "Arial Bold", Impact, Arial, sans-serif',
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 6,
          lineHeight: 1,
          position: 'relative',
          zIndex: 2,
          textShadow: '0 0 16px rgba(245,197,24,0.7)',
        }}>
          SABULA
        </div>

        {/* Chart bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 10, height: 36, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 14, height: 18, borderRadius: '3px 3px 0 0', background: 'linear-gradient(180deg,#00ff88,#003322)' }} />
          <div style={{ width: 14, height: 28, borderRadius: '3px 3px 0 0', background: 'linear-gradient(180deg,#00ff88,#005533)' }} />
          <div style={{ width: 14, height: 36, borderRadius: '3px 3px 0 0', background: 'linear-gradient(180deg,#00ff88,#009944)' }} />
          {/* Trend line */}
          <div style={{
            position: 'absolute',
            left: 7, bottom: 18,
            width: 56, height: 2,
            background: '#f5c518',
            transform: 'rotate(-28deg)',
            transformOrigin: 'left center',
            borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute',
            right: 0, top: 0,
            width: 7, height: 7,
            borderRadius: 4,
            background: '#f5c518',
          }} />
        </div>

        {/* 256 pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 14,
          width: 100,
          height: 30,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #00ff88, #00cc66)',
          position: 'relative',
          zIndex: 2,
        }}>
          <span style={{
            color: '#040c06',
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: 3,
            lineHeight: 1,
          }}>256</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
