'use client'

const OPTION_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b']

type Option = { id: string; label: string; total_pool: number }

interface Props {
  options: Option[]
  totalPool: number
  rake: number
  highlightOptionId?: string | null
}

export default function BetDistribution({ options, totalPool, rake, highlightOptionId }: Props) {
  const hasPool = totalPool > 0
  const fmt = (n: number) => n.toLocaleString()

  const segments = options.map((opt, idx) => {
    const color = OPTION_COLORS[Math.min(idx, OPTION_COLORS.length - 1)]
    const amount = Number(opt.total_pool)
    const pct = hasPool ? (amount / totalPool) * 100 : 100 / options.length
    const marketOdds = hasPool && amount > 0
      ? ((totalPool * (1 - rake)) / amount).toFixed(2) + 'x'
      : '—'
    const impliedOdds = pct > 0 ? (100 / pct).toFixed(2) + 'x' : '—'
    return { opt, color, amount, pct, marketOdds, impliedOdds }
  })

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Bet Distribution
        </span>
        <span className="text-[10px] text-slate-600">
          UGX {fmt(totalPool)} pool
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-4 overflow-hidden rounded-full bg-[#1a1a2e]">
        {segments.map(({ opt, color, pct }, idx) => (
          <div
            key={opt.id}
            className="h-full transition-all duration-700"
            title={`${opt.label}: ${pct.toFixed(1)}%`}
            style={{
              width: `${pct}%`,
              background: color,
              opacity: highlightOptionId && highlightOptionId !== opt.id ? 0.3 : 1,
              borderRight: idx < segments.length - 1 ? '2px solid #0a0a0f' : undefined,
            }}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className={`grid gap-2 ${options.length > 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {segments.map(({ opt, color, amount, pct, marketOdds }) => {
          const isHighlighted = highlightOptionId === opt.id
          return (
            <div
              key={opt.id}
              className="rounded-lg px-3 py-2 space-y-1"
              style={{
                background: `${color}${isHighlighted ? '1e' : '0d'}`,
                border: `1px solid ${color}${isHighlighted ? '55' : '28'}`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-xs font-bold truncate"
                  style={{ color }}
                  title={opt.label}
                >
                  {opt.label}
                </span>
                <span className="text-sm font-black shrink-0" style={{ color }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>UGX {fmt(amount)}</span>
                <span title="Current payout multiplier if this option wins">
                  {marketOdds}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Amounts row for binary markets */}
      {options.length === 2 && hasPool && (
        <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-[#1e1e2e] pt-2">
          <span style={{ color: segments[0].color }}>{segments[0].pct.toFixed(1)}% · UGX {fmt(segments[0].amount)}</span>
          <span className="text-slate-700">vs</span>
          <span style={{ color: segments[1].color }}>UGX {fmt(segments[1].amount)} · {segments[1].pct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}
