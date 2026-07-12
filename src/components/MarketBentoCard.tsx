'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FeatCard } from '@/components/ui/agent-bento-grid'
import { getEntityLogo, getEntityLogoFromTitle } from '@/lib/entity-logos'
import EntityLogo from '@/components/EntityLogo'

interface Opt { id: string; label: string; total_pool: number }
interface Market {
  id: string
  title: string
  description?: string | null
  total_pool: number
  options: Opt[]
  closes_at: string | null
  status: string
  rake_pct?: number
  metadata?: Record<string, unknown>
}

type Urgency = 'normal' | 'day' | 'hour' | 'final' | 'expired'

function useCountdown(closesAt: string | null, isOpen: boolean) {
  const [display, setDisplay] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('normal')

  useEffect(() => {
    if (!closesAt || !isOpen) return
    function update() {
      const diff = new Date(closesAt!).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Closed'); setUrgency('expired'); return }
      const days  = Math.floor(diff / 86_400_000)
      const hours = Math.floor((diff % 86_400_000) / 3_600_000)
      const mins  = Math.floor((diff % 3_600_000) / 60_000)
      const secs  = Math.floor((diff % 60_000) / 1_000)
      if (days >= 2)       { setDisplay(`${days}d ${hours}h`);  setUrgency('normal') }
      else if (days >= 1)  { setDisplay(`${days}d ${hours}h`);  setUrgency('day')   }
      else if (hours >= 1) { setDisplay(`${hours}h ${mins}m`);  setUrgency('hour')  }
      else                 { setDisplay(`${mins}m ${secs}s`);   setUrgency('final') }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [closesAt, isOpen])

  return { display, urgency }
}

const CAT_MAP: Record<string, { icon: string; color: string }> = {
  football:       { icon: '⚽', color: '#a3e635' },
  politics:       { icon: '🏛️', color: '#60a5fa' },
  economy:        { icon: '💰', color: '#fbbf24' },
  entertainment:  { icon: '🎵', color: '#f472b6' },
  tech:           { icon: '📱', color: '#22d3ee' },
  infrastructure: { icon: '🏗️', color: '#fb923c' },
  agriculture:    { icon: '🌿', color: '#34d399' },
  updown:         { icon: '📈', color: '#4ade80' },
  default:        { icon: '🔮', color: '#a78bfa' },
}

function detectCat(title: string, desc = '', metadata?: Record<string, unknown>): string {
  if (metadata?.type === 'updown' || metadata?.type === 'price_level') return 'updown'
  const stored = metadata?.category as string | undefined
  if (stored && stored in CAT_MAP) return stored
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|fufa|kcca|vipers|express.?fc|cranes|afcon|world.?cup/.test(t)) return 'football'
  if (/president|election|parliament|political|museveni|vote|nup|nrm|minister/.test(t)) return 'politics'
  if (/oil|exchange.?rate|ugx|bitcoin|btc|crypto|gdp|economy|coffee|shilling/.test(t)) return 'economy'
  if (/music|artist|album|festival|eddy.?kenzo|chameleone|fik.?fameica/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel|mtn.?momo|telecom/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road|bridge/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|harvest/.test(t)) return 'agriculture'
  return 'default'
}

function fmtPool(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function MarketBentoCard({ market }: { market: Market }) {
  const router = useRouter()
  const opts  = market.options ?? []
  const total = Number(market.total_pool)
  const rake  = market.rake_pct ?? 0.08
  const isOpen = market.status === 'open'
  const isAsset = market.metadata?.type === 'updown' || market.metadata?.type === 'price_level'

  const { display: countdown, urgency } = useCountdown(market.closes_at, isOpen)

  const optA = opts[0]?.label ?? 'YES'
  const optB = opts[1]?.label ?? 'NO'
  const pctA = total > 0 ? (opts[0]?.total_pool ?? 0) / total * 100 : 50
  const pctB = total > 0 ? (opts[1]?.total_pool ?? 0) / total * 100 : 50
  const oddsA = total > 0 && (opts[0]?.total_pool ?? 0) > 0 ? ((total * (1 - rake)) / opts[0].total_pool).toFixed(2) : null
  const oddsB = total > 0 && (opts[1]?.total_pool ?? 0) > 0 ? ((total * (1 - rake)) / opts[1].total_pool).toFixed(2) : null

  const metaTeam1Image = market.metadata?.team1Image as string | undefined
  const metaTeam2Image = market.metadata?.team2Image as string | undefined
  const metaPartyImage = market.metadata?.partyImage as string | undefined
  let logoA = metaTeam1Image || getEntityLogo(optA)
  let logoB = metaTeam2Image || getEntityLogo(optB)
  if (!logoA && !logoB) {
    const fromTitle = getEntityLogoFromTitle(market.title)
    logoA = fromTitle.logoA
    logoB = fromTitle.logoB
  }
  if (!logoA && !logoB && metaPartyImage) logoA = metaPartyImage
  const hasBothLogos = !!(logoA && logoB) && !isAsset

  const catKey = detectCat(market.title, market.description ?? '', market.metadata)
  const cat    = CAT_MAP[catKey] ?? CAT_MAP.default

  const statusText = !isOpen
    ? market.status === 'settled' ? 'Settled' : 'Closed'
    : countdown || 'Open'

  const timerColor =
    urgency === 'final'   ? 'text-red-400' :
    urgency === 'hour'    ? 'text-orange-400' :
    urgency === 'day'     ? 'text-amber-400' : 'text-slate-400'

  return (
    <div
      className="h-full cursor-pointer"
      onClick={() => router.push(`/markets/${market.id}`)}
    >
      <FeatCard
        title={market.title}
        description={`${cat.icon}  ${statusText}  ·  Pool: UGX ${fmtPool(total)}`}
        className="h-full"
      >
        <div className="w-full h-full flex flex-col p-3 gap-3">

          {/* ── Entity logos / category visual ── */}
          {hasBothLogos ? (
            <div className="flex items-center justify-center gap-3 pt-1 flex-shrink-0">
              <EntityLogo name={optA} src={logoA} size={40} shape="circle" />
              <span className="text-[11px] font-black text-muted-foreground/40 tracking-widest">VS</span>
              <EntityLogo name={optB} src={logoB} size={40} shape="circle" />
            </div>
          ) : logoA ? (
            <div className="flex justify-center pt-1 flex-shrink-0">
              <EntityLogo name={optA} src={logoA} size={40} shape="circle" />
            </div>
          ) : (
            <div className="flex justify-center pt-1 flex-shrink-0">
              <span className="text-3xl">{cat.icon}</span>
            </div>
          )}

          {/* ── Probability bar ── */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-mono font-bold text-emerald-400 truncate max-w-[45%]">{optA}</span>
              {opts[1] && <span className="text-[11px] font-mono font-bold text-rose-400 truncate max-w-[45%] text-right">{optB}</span>}
            </div>

            <div className="h-2 rounded-full overflow-hidden bg-rose-500/20 relative">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: '50%' }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black font-mono" style={{ color: cat.color }}>
                {pctA.toFixed(0)}%
              </span>
              {opts[1] && (
                <span className="text-[11px] font-black font-mono text-rose-400">
                  {pctB.toFixed(0)}%
                </span>
              )}
            </div>

            {(oddsA || oddsB) && (
              <div className="flex justify-between text-[10px] font-mono font-bold text-muted-foreground/60">
                {oddsA && <span>{oddsA}×</span>}
                {oddsB && <span>{oddsB}×</span>}
              </div>
            )}
          </div>

          {/* ── Footer: status badge + countdown ── */}
          <div className="flex items-center justify-between flex-shrink-0">
            <span
              className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                isOpen
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-muted/40 text-muted-foreground/60'
              }`}
            >
              {isOpen ? 'LIVE' : market.status.toUpperCase()}
            </span>
            {isOpen && countdown && (
              <span className={`text-[11px] font-mono font-bold ${timerColor}`}>
                ⏱ {countdown}
              </span>
            )}
          </div>

        </div>
      </FeatCard>
    </div>
  )
}
