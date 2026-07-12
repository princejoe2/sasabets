import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 32, height: 32,
        background: 'linear-gradient(145deg, #0d2818, #040c06)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Gold S */}
        <span style={{
          color: '#f5c518',
          fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
          fontWeight: 900,
          fontSize: 21,
          lineHeight: 1,
          position: 'relative',
          zIndex: 2,
          marginTop: -1,
        }}>S</span>

        {/* Green dot bottom-right */}
        <div style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 5,
          height: 5,
          borderRadius: 3,
          background: '#00ff88',
          zIndex: 3,
        }} />

        {/* Subtle green corner glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 14,
          height: 14,
          borderRadius: '0 8px 0 14px',
          background: 'rgba(0,255,136,0.12)',
        }} />
      </div>
    ),
    { ...size }
  )
}
