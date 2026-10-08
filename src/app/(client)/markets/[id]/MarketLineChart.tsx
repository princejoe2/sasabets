'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MarketOutcome } from './types'
import { OUTCOME_COLORS } from './types'

type Range = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL'
const RANGES: Range[] = ['1H', '6H', '1D', '1W', '1M', 'ALL']

type ChartRow = Record<string, string | number>
type ChartData = { points: ChartRow[]; options: string[]; top4: string[] }

type Props = { marketId: string; outcomes: MarketOutcome[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a: { value: number }, b: { value: number }) => (b.value ?? 0) - (a.value ?? 0))
  return (
    <div className="rounded-r-card border border-mk-border bg-mk-card/95 p-3 shadow-xl text-xs min-w-[160px]">
      <p className="mb-2 text-mk-muted font-medium">{label}</p>
      {sorted.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-mk-secondary truncate max-w-[100px]">{entry.name}</span>
          </span>
          <span className="tabular font-bold" style={{ color: entry.color }}>
            {typeof entry.value === 'number' ? `${entry.value.toFixed(0)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MarketLineChart({ marketId, outcomes }: Props) {
  const [range,   setRange]   = useState<Range>('ALL')
  const [data,    setData]    = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden,  setHidden]  = useState<Set<string>>(new Set())

  const load = useCallback(async (r: Range) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/market/${marketId}/chart?range=${r}`)
      const d: ChartData = await res.json()
      setData(d)
      if (d.top4 && d.options.length > 4) {
        setHidden(new Set(d.options.filter(o => !d.top4.includes(o))))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [marketId])

  useEffect(() => { load(range) }, [range, load])

  function toggleOutcome(name: string) {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const legendItems = (data?.options ?? []).map(name => {
    const outcome = outcomes.find(o => o.name === name)
    const color   = OUTCOME_COLORS[(outcome?.color_index ?? 0) % OUTCOME_COLORS.length]
    const latest  = data?.points[data.points.length - 1]
    const pct     = latest ? Number(latest[name] ?? 0) : 0
    return { name, color, pct, hidden: hidden.has(name) }
  })

  function fmtX(t: string) {
    try {
      const d = new Date(t)
      if (range === '1H' || range === '6H') {
        return d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  if (loading) {
    return (
      <div className="rounded-r-card border border-mk-border bg-mk-card p-4 mb-4">
        <div className="animate-pulse space-y-3">
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-4 w-16 rounded bg-mk-raised" />)}
          </div>
          <div className="h-52 rounded bg-mk-raised" />
          <div className="flex justify-end gap-1">
            {RANGES.map(r => <div key={r} className="h-6 w-8 rounded bg-mk-raised" />)}
          </div>
        </div>
      </div>
    )
  }

  const hasData = data && data.points.length >= 2

  return (
    <div className="rounded-r-card border border-mk-border bg-mk-card p-4 mb-4">
      {/* Legend */}
      {hasData && (
        <div className="flex flex-wrap gap-3 mb-3">
          {legendItems.map(item => (
            <button
              key={item.name}
              onClick={() => toggleOutcome(item.name)}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${item.hidden ? 'opacity-40' : ''}`}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-mk-secondary">{item.name}</span>
              <span className="tabular font-bold" style={{ color: item.color }}>{item.pct.toFixed(0)}%</span>
            </button>
          ))}
          <span className="ml-auto text-[10px] text-mk-muted self-center">Sabula 256</span>
        </div>
      )}

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#222222" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={fmtX}
              tick={{ fontSize: 10, fill: '#6B6B6B' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: '#6B6B6B' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#444', strokeWidth: 1 }} />
            {(data.options ?? []).map(name => {
              const outcome = outcomes.find(o => o.name === name)
              const color   = OUTCOME_COLORS[(outcome?.color_index ?? 0) % OUTCOME_COLORS.length]
              return (
                <Line
                  key={name}
                  yAxisId="right"
                  type="stepAfter"
                  dataKey={name}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  hide={hidden.has(name)}
                  isAnimationActive={false}
                  connectNulls
                  activeDot={{ r: 4, fill: color }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-52 items-center justify-center text-sm text-mk-muted">
          Not enough activity yet to show a chart.
        </div>
      )}

      {/* Footer: time-range tabs */}
      <div className="mt-3 flex items-center justify-end">
        <div className="flex gap-0.5">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                range === r
                  ? 'bg-mk-raised text-mk-text font-semibold'
                  : 'text-mk-muted hover:text-mk-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
