import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 32, height: 32, display: 'flex', position: 'relative',
        background: '#040c06', borderRadius: 7, overflow: 'hidden',
      }}>
        {/* Bar 1 — shortest */}
        <div style={{ position: 'absolute', bottom: 3, left: 4, width: 5, height: 9, borderRadius: '2px 2px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#003322 100%)' }} />
        {/* Bar 2 — medium */}
        <div style={{ position: 'absolute', bottom: 3, left: 12, width: 5, height: 14, borderRadius: '2px 2px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#005533 100%)' }} />
        {/* Bar 3 — tallest */}
        <div style={{ position: 'absolute', bottom: 3, left: 20, width: 5, height: 21, borderRadius: '2px 2px 0 0', background: 'linear-gradient(180deg,#00ff88 0%,#009944 100%)' }} />
        {/* Yellow trend line */}
        <div style={{ position: 'absolute', left: 7, bottom: 12, width: 22, height: 2, background: '#f5c518', transform: 'rotate(-36deg)', transformOrigin: 'left center', opacity: 0.92 }} />
        {/* Glowing dot at trend line tip */}
        <div style={{ position: 'absolute', left: 23, top: 5, width: 4, height: 4, borderRadius: 2, background: '#f5c518', opacity: 0.9 }} />
        {/* Baseline */}
        <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, height: 1, background: 'rgba(0,255,136,0.2)' }} />
      </div>
    ),
    { ...size }
  )
}
