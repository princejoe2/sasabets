'use client'
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

const PALETTE = [
  '#00ff88', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#34d399', '#fb923c', '#22d3ee', '#e879f9', '#4ade80',
]

interface AreaChartProps {
  data: Record<string, string | number>[]
  index: string
  categories: string[]
  className?: string
  valueFormatter?: (value: number) => string
  onValueChange?: (value: unknown) => void
  colors?: string[]
  yAxisWidth?: number
  showLegend?: boolean
  showGridLines?: boolean
  startEndOnly?: boolean
  connectNulls?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, valueFormatter, categories }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm text-xs">
      <p className="mb-2 font-bold text-foreground/70">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className="font-black tabular-nums" style={{ color: entry.color }}>
            {valueFormatter && entry.value != null ? valueFormatter(entry.value) : (entry.value ?? '—')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AreaChart({
  data,
  index,
  categories,
  className,
  valueFormatter,
  onValueChange,
  colors,
  yAxisWidth = 40,
  showLegend = true,
  showGridLines = true,
  connectNulls = true,
}: AreaChartProps) {
  const palette = colors ?? PALETTE

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          onClick={onValueChange ? (e) => onValueChange(e) : undefined}
        >
          <defs>
            {categories.map((cat, i) => (
              <linearGradient key={cat} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {showGridLines && (
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          )}
          <XAxis
            dataKey={index}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            width={yAxisWidth}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={valueFormatter ? (v) => (typeof v === 'number' && isFinite(v) ? valueFormatter(v) : '') : undefined}
          />
          <Tooltip
            content={<CustomTooltip valueFormatter={valueFormatter} categories={categories} />}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {categories.map((cat, i) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={palette[i % palette.length]}
              strokeWidth={2}
              fill={`url(#grad-${i})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={connectNulls}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
