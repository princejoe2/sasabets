'use client'
import { useEffect, useState } from 'react'
import { AreaChart } from '@/components/AreaChart'

interface Point extends Record<string, string | number> {
  t: string
  pool: number
}

interface ChartData {
  points: Point[]
  options: string[]
}

function fmtLabel(t: string): string {
  const d = new Date(t)
  return d.toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })
}

export default function MarketChart({ marketId }: { marketId: string }) {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/market/${marketId}/chart`)
      .then(r => r.json())
      .then((d: ChartData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [marketId])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!data || data.points.length < 2 || data.options.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Not enough bets yet to show a chart.
      </div>
    )
  }

  // Format timestamps to readable labels
  const chartData = data.points.map(p => ({
    ...p,
    date: fmtLabel(p.t as string),
  }))

  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-black text-foreground">Probability Over Time</span>
        <span className="text-[10px] text-muted-foreground/60">% of pool per side</span>
      </div>
      <AreaChart
        className="h-52"
        data={chartData}
        index="date"
        categories={data.options}
        valueFormatter={(n: number) => (typeof n === 'number' && isFinite(n) ? `${n.toFixed(0)}%` : '')}
        showLegend={data.options.length <= 6}
        yAxisWidth={36}
      />
    </div>
  )
}
