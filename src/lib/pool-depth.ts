export type PoolDepthRating = 'seed' | 'thin' | 'moderate' | 'deep' | 'liquid'

export interface PoolDepth {
  rating: PoolDepthRating
  label: string
  warning: string | null
}

export function getPoolDepth(totalPool: number): PoolDepth {
  if (totalPool < 100_000) {
    return {
      rating: 'seed',
      label: 'Early market',
      warning: 'Odds will shift significantly as more people join',
    }
  }
  if (totalPool < 500_000) {
    return {
      rating: 'thin',
      label: 'Growing market',
      warning: 'Odds may still change — pool is building',
    }
  }
  if (totalPool < 2_000_000) {
    return { rating: 'moderate', label: 'Active market', warning: null }
  }
  if (totalPool < 10_000_000) {
    return { rating: 'deep', label: 'Strong market', warning: null }
  }
  return { rating: 'liquid', label: 'High-volume market', warning: null }
}

export const DEPTH_BADGE: Record<PoolDepthRating, { bg: string; border: string; color: string; icon: string }> = {
  seed:     { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  color: '#fbbf24', icon: '🌱' },
  thin:     { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)',  color: '#f59e0b', icon: '📈' },
  moderate: { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', color: '#94a3b8', icon: '⚡' },
  deep:     { bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.28)',  color: '#4ade80', icon: '💪' },
  liquid:   { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)',  color: '#22c55e', icon: '✅' },
}
