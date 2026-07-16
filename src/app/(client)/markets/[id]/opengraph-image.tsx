import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Sabula 256 Prediction Market'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Hardcoded to avoid BOM-injected env vars breaking fetch in edge runtime.
const SB_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'

type Opt = { id: string; label: string; total_pool: number }

const CATEGORY_COLORS: Record<string, { primary: string; glow: string; badge: string }> = {
  football:       { primary: '#22c55e', glow: 'rgba(34,197,94,0.2)',   badge: 'rgba(34,197,94,0.15)'   },
  politics:       { primary: '#f87171', glow: 'rgba(248,113,113,0.2)', badge: 'rgba(248,113,113,0.15)' },
  economy:        { primary: '#fbbf24', glow: 'rgba(251,191,36,0.2)',  badge: 'rgba(251,191,36,0.15)'  },
  entertainment:  { primary: '#e879f9', glow: 'rgba(232,121,249,0.2)', badge: 'rgba(232,121,249,0.15)' },
  infrastructure: { primary: '#fb923c', glow: 'rgba(251,146,60,0.2)',  badge: 'rgba(251,146,60,0.15)'  },
  tech:           { primary: '#38bdf8', glow: 'rgba(56,189,248,0.2)',  badge: 'rgba(56,189,248,0.15)'  },
  agriculture:    { primary: '#86efac', glow: 'rgba(134,239,172,0.2)', badge: 'rgba(134,239,172,0.15)' },
  default:        { primary: '#a78bfa', glow: 'rgba(167,139,250,0.2)', badge: 'rgba(167,139,250,0.15)' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  football: '⚽', politics: '🏛️', economy: '💰',
  entertainment: '🎤', infrastructure: '🛢️', tech: '💻',
  agriculture: '🌾', default: '🎯',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

// Option bar colors — cycle through a set for 2–4 options
const OPT_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981']

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let title    = 'Sabula 256 Prediction Market'
  let opts: Opt[] = []
  let pool     = 0
  let status   = 'open'
  let category = 'default'

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/markets?id=eq.${id}&select=title,options,total_pool,status,metadata&limit=1`,
      { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` }, next: { revalidate: 60 } }
    )
    const [m] = await res.json() as [{ title: string; options: Opt[]; total_pool: number; status: string; metadata?: Record<string, unknown> } | undefined]
    if (m) {
      title    = m.title
      opts     = m.options ?? []
      pool     = Number(m.total_pool ?? 0)
      status   = m.status
      category = (m.metadata?.category as string | undefined) ?? 'default'
    }
  } catch { /* render fallback */ }

  const isSettled = status === 'settled'
  const isClosed  = status === 'closed'
  const poolStr   = pool > 0 ? fmt(pool) : 'Be first to bet!'
  const theme     = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default
  const emoji     = CATEGORY_EMOJI[category] ?? '🎯'

  // Compute probabilities for all options
  const optsWithProb = opts.map(opt => {
    const optPool = Number(opt.total_pool ?? 0)
    const prob = pool > 0 ? Math.round((optPool / pool) * 100) : Math.round(100 / opts.length)
    return { ...opt, prob }
  })
  // Clamp so they sum to 100 (rounding fix on last item)
  if (optsWithProb.length > 0) {
    const sum = optsWithProb.reduce((s, o) => s + o.prob, 0)
    optsWithProb[optsWithProb.length - 1].prob += (100 - sum)
  }

  const displayOpts = optsWithProb.slice(0, 3) // show max 3 to keep layout clean
  const fontSize = title.length > 90 ? 32 : title.length > 60 ? 38 : title.length > 40 ? 44 : 52

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(145deg, #08080e 0%, #0f0820 55%, #08080e 100%)',
          fontFamily: 'system-ui, sans-serif', padding: '44px 56px', position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Category glow blob */}
        <div style={{
          position: 'absolute', width: 560, height: 560, borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
          top: -140, right: -100, display: 'flex',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)`,
          bottom: -60, left: 60, display: 'flex',
        }} />

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 11,
            background: 'linear-gradient(135deg, #7c3aed, #4f1b8f)',
            fontSize: 22, fontWeight: 900, color: 'white',
          }}>S</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa', letterSpacing: 3 }}>SABULA 256</span>

          <div style={{ flex: 1, display: 'flex' }} />

          {/* Category badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: theme.badge,
            border: `1px solid ${theme.primary}40`,
            borderRadius: 20, padding: '5px 14px',
          }}>
            <span style={{ fontSize: 15 }}>{emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.primary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {category}
            </span>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: isSettled ? 'rgba(52,211,153,0.12)' : isClosed ? 'rgba(148,163,184,0.12)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${isSettled ? 'rgba(52,211,153,0.3)' : isClosed ? 'rgba(148,163,184,0.25)' : 'rgba(251,191,36,0.25)'}`,
            borderRadius: 20, padding: '5px 14px',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isSettled ? '#34d399' : isClosed ? '#94a3b8' : '#fbbf24',
              display: 'flex',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: isSettled ? '#34d399' : isClosed ? '#94a3b8' : '#fbbf24' }}>
              {isSettled ? 'SETTLED' : isClosed ? 'CLOSED' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* ── Market title ── */}
        <div style={{
          fontSize, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2,
          marginBottom: displayOpts.length > 0 ? 36 : 0,
          maxWidth: 1080, letterSpacing: '-0.5px',
        }}>
          {title}
        </div>

        {/* ── Options bars (up to 3) ── */}
        {displayOpts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: displayOpts.length > 2 ? 12 : 16 }}>
            {displayOpts.map((opt, i) => {
              const color = OPT_COLORS[i % OPT_COLORS.length]
              return (
                <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: displayOpts.length > 2 ? 17 : 20, fontWeight: 700, color: '#e2e8f0' }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: displayOpts.length > 2 ? 20 : 24, fontWeight: 900, color }}>
                      {opt.prob}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: displayOpts.length > 2 ? 8 : 10,
                    borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${opt.prob}%`, height: '100%', borderRadius: 6,
                      background: `linear-gradient(90deg, ${color}, ${color}99)`,
                      display: 'flex',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          position: 'absolute', bottom: 44, left: 56, right: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 20, padding: '8px 20px',
          }}>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Prize Pool</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0' }}>{poolStr}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#7c3aed', fontWeight: 600 }}>Win via</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,204,0,0.1)', border: '1px solid rgba(255,204,0,0.2)',
              borderRadius: 20, padding: '5px 14px',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24' }}>MTN & Airtel MoMo</span>
            </div>
          </div>

          <span style={{ fontSize: 16, fontWeight: 700, color: '#6d28d9' }}>sabula256.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
