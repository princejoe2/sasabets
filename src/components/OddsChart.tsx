'use client'
import { useEffect, useRef, useState } from 'react'

interface ChartPoint { t: string; pA: number; pB: number; pool: number }

const W = 600
const H = 150
const PAD_L = 36
const PAD_R = 16
const PAD_T = 14
const PAD_B = 24
const INNER_W = W - PAD_L - PAD_R
const INNER_H = H - PAD_T - PAD_B

function yOf(pct: number) {
  return PAD_T + ((100 - pct) / 100) * INNER_H
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
}

function formatTooltipTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  marketId: string
  labelA: string
  labelB: string
  colorA?: string
  colorB?: string
}

export default function OddsChart({
  marketId,
  labelA,
  labelB,
  colorA = '#a78bfa',
  colorB = '#fbbf24',
}: Props) {
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [hover, setHover] = useState<{ idx: number; svgX: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch(`/api/market/${marketId}/chart`)
      .then(r => r.json())
      .then(d => setPoints(d.points ?? []))
      .catch(() => {})
  }, [marketId])

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-14 rounded-xl border border-[#1e1e2e] bg-[#0d0d14] text-xs text-slate-700">
        Chart appears once bets are placed
      </div>
    )
  }

  const minT = new Date(points[0].t).getTime()
  const maxT = new Date(points[points.length - 1].t).getTime()
  const tRange = maxT - minT || 1

  function xOf(t: string) {
    return PAD_L + ((new Date(t).getTime() - minT) / tRange) * INNER_W
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.pA).toFixed(1)}`)
    .join(' ')

  const lastPt = points[points.length - 1]
  const lastX = xOf(lastPt.t)
  const lastY = yOf(lastPt.pA)
  const bottomY = PAD_T + INNER_H

  const areaPath =
    linePath +
    ` L ${lastX.toFixed(1)} ${bottomY} L ${PAD_L} ${bottomY} Z`

  // Time tick labels: first, middle, last
  const ticks = [points[0], points[Math.floor((points.length - 1) / 2)], lastPt]

  // Hover
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    if (svgX < PAD_L || svgX > W - PAD_R) { setHover(null); return }

    const idx = points.reduce((best, p, i) => {
      const px = xOf(p.t)
      const bx = xOf(points[best].t)
      return Math.abs(px - svgX) < Math.abs(bx - svgX) ? i : best
    }, 0)

    setHover({ idx, svgX: xOf(points[idx].t) })
  }

  const hoverPt = hover !== null ? points[hover.idx] : null
  const currentPt = lastPt

  // Tooltip position: flip to left if too close to right edge
  const tooltipW = 138
  const tooltipX = hover
    ? hover.svgX + 10 + tooltipW > W
      ? hover.svgX - tooltipW - 6
      : hover.svgX + 10
    : 0

  const gradId = `gc-${marketId.slice(0, 8)}`
  const clipId = `cc-${marketId.slice(0, 8)}`

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a28]">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Probability</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: colorA }} />
            <span className="text-slate-500">{labelA}</span>
            <span className="font-black tabular-nums" style={{ color: colorA }}>
              {(hoverPt ?? currentPt).pA.toFixed(1)}%
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: colorB }} />
            <span className="text-slate-500">{labelB}</span>
            <span className="font-black tabular-nums" style={{ color: colorB }}>
              {(hoverPt ?? currentPt).pB.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.32" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={PAD_L} y={PAD_T} width={INNER_W} height={INNER_H + 1} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <g key={y}>
            <line
              x1={PAD_L} y1={yOf(y)} x2={W - PAD_R} y2={yOf(y)}
              stroke={y === 50 ? '#2a2a4e' : '#161622'}
              strokeWidth={y === 50 ? 1.2 : 0.6}
              strokeDasharray={y === 50 ? '4 3' : undefined}
            />
            <text
              x={PAD_L - 5} y={yOf(y) + 3.5}
              textAnchor="end" fontSize="9" fill="#334155"
            >
              {y}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke={colorA}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />

        {/* X-axis tick labels */}
        {ticks.map((p, i) => {
          const x = xOf(p.t)
          const anchor = i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'
          return (
            <text
              key={i}
              x={x} y={H - 4}
              textAnchor={anchor} fontSize="8.5" fill="#334155"
            >
              {formatTime(p.t)}
            </text>
          )
        })}

        {/* Current endpoint dot */}
        {!hover && (
          <circle cx={lastX} cy={lastY} r="4" fill={colorA} stroke="#0d0d14" strokeWidth="2" />
        )}

        {/* Hover crosshair + dot + tooltip */}
        {hover && hoverPt && (
          <g>
            <line
              x1={hover.svgX} y1={PAD_T}
              x2={hover.svgX} y2={PAD_T + INNER_H}
              stroke="#2a2a4e" strokeWidth="1" strokeDasharray="3 2"
            />
            <circle
              cx={hover.svgX} cy={yOf(hoverPt.pA)}
              r="5" fill={colorA} stroke="#0d0d14" strokeWidth="2"
            />

            {/* Tooltip box */}
            <g transform={`translate(${tooltipX}, ${PAD_T + 4})`}>
              <rect width={tooltipW} height={64} rx="5" fill="#1a1a28" stroke="#2a2a4e" strokeWidth="0.8" />
              <text x="10" y="15" fontSize="8.5" fill="#475569">{formatTooltipTime(hoverPt.t)}</text>
              <line x1="10" y1="22" x2={tooltipW - 10} y2="22" stroke="#1e1e2e" strokeWidth="0.6" />
              <circle cx="18" cy="36" r="4" fill={colorA} />
              <text x="27" y="39.5" fontSize="10" fill="#e2e8f0">{labelA}</text>
              <text x={tooltipW - 8} y="39.5" textAnchor="end" fontSize="10" fontWeight="bold" fill={colorA}>
                {hoverPt.pA.toFixed(1)}%
              </text>
              <circle cx="18" cy="52" r="4" fill={colorB} />
              <text x="27" y="55.5" fontSize="10" fill="#e2e8f0">{labelB}</text>
              <text x={tooltipW - 8} y="55.5" textAnchor="end" fontSize="10" fontWeight="bold" fill={colorB}>
                {hoverPt.pB.toFixed(1)}%
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
