import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Sabula 256 Prediction Market'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const SB_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'

type Opt = { id: string; label: string; total_pool: number }

function fmt(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

export default async function Image({ params }: { params: { id: string } }) {
  let title  = 'Sabula 256 Prediction Market'
  let opts: Opt[] = []
  let pool   = 0
  let status = 'open'

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/markets?id=eq.${params.id}&select=title,options,total_pool,status&limit=1`,
      { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }, next: { revalidate: 60 } }
    )
    const [m] = await res.json() as [{ title: string; options: Opt[]; total_pool: number; status: string } | undefined]
    if (m) { title = m.title; opts = m.options ?? []; pool = Number(m.total_pool ?? 0); status = m.status }
  } catch { /* render fallback */ }

  const optA   = opts[0]
  const optB   = opts[1]
  const probA  = pool > 0 && optA ? Math.round((Number(optA.total_pool) / pool) * 100) : 50
  const probB  = 100 - probA
  const isSettled = status === 'settled'
  const poolStr = pool > 0 ? fmt(pool) : 'No bets yet'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #130a24 60%, #0a0a0f 100%)',
          fontFamily: 'system-ui, sans-serif', padding: '48px 56px', position: 'relative',
        }}
      >
        {/* Purple glow */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          top: -100, right: -100, display: 'flex',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #4f1b8f)',
            fontSize: 26, fontWeight: 900, color: 'white',
          }}>S</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa', letterSpacing: 2 }}>SABULA 256</span>
          <div style={{ flex: 1, display: 'flex' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isSettled ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.12)',
            border: `1px solid ${isSettled ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.25)'}`,
            borderRadius: 20, padding: '6px 16px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isSettled ? '#34d399' : '#fbbf24', display: 'flex',
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: isSettled ? '#34d399' : '#fbbf24' }}>
              {isSettled ? 'SETTLED' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* Market title */}
        <div style={{
          fontSize: title.length > 80 ? 36 : title.length > 50 ? 42 : 50,
          fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2,
          marginBottom: 40, maxWidth: 1000,
          display: '-webkit-box', overflow: 'hidden',
        }}>
          {title}
        </div>

        {/* Options bars */}
        {optA && optB && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
            {[
              { opt: optA, prob: probA, color: '#7c3aed', bg: 'rgba(124,58,237,0.2)', border: 'rgba(124,58,237,0.4)' },
              { opt: optB, prob: probB, color: '#0ea5e9', bg: 'rgba(14,165,233,0.2)', border: 'rgba(14,165,233,0.4)' },
            ].map(({ opt, prob, color, bg, border }) => (
              <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{opt.label}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color }}>{prob}%</span>
                </div>
                {/* Progress bar */}
                <div style={{
                  width: '100%', height: 10, borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)', display: 'flex', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${prob}%`, height: '100%', borderRadius: 6,
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    display: 'flex',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div style={{
          position: 'absolute', bottom: 48, left: 56, right: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '8px 20px',
          }}>
            <span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>Pool</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>{poolStr}</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#4c1d95' }}>sabula256.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
