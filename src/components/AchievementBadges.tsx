'use client'
import { useEffect, useState } from 'react'

type Achievement = {
  id: string; icon: string; label: string; desc: string; earned: boolean
}

export default function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [newlyEarned, setNewlyEarned] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(data => {
        const list: Achievement[] = data.achievements ?? []
        setAchievements(list)

        // Check for newly earned (not seen before)
        const seenRaw = localStorage.getItem('seen-achievements') ?? '[]'
        const seen = new Set<string>(JSON.parse(seenRaw))
        const freshEarned = list.filter(a => a.earned && !seen.has(a.id)).map(a => a.id)
        if (freshEarned.length > 0) {
          setNewlyEarned(freshEarned)
          const allEarned = list.filter(a => a.earned).map(a => a.id)
          localStorage.setItem('seen-achievements', JSON.stringify(allEarned))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-[#1e1e2e] animate-pulse" />
      ))}
    </div>
  )

  const earned = achievements.filter(a => a.earned)
  const locked = achievements.filter(a => !a.earned)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-200">Achievements</h3>
        <span className="text-sm text-slate-500">{earned.length}/{achievements.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[#1e1e2e]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${(earned.length / Math.max(achievements.length, 1)) * 100}%` }}
        />
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {earned.map(a => (
            <div
              key={a.id}
              title={`${a.label}: ${a.desc}`}
              className={`group relative flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all cursor-default ${
                newlyEarned.includes(a.id)
                  ? 'border-amber-700/50 bg-amber-950/30 ring-2 ring-amber-400/40'
                  : 'border-[#1e1e2e] bg-[#0a0a0f] hover:border-violet-700/50 hover:bg-violet-950/20'
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-[9px] font-bold text-center text-slate-400 leading-tight">{a.label}</span>
              {newlyEarned.includes(a.id) && (
                <span className="absolute -top-1 -right-1 rounded-full bg-amber-400 px-1 text-[8px] font-black text-white">NEW</span>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-32 rounded-lg bg-slate-900 border border-[#1e1e2e] px-2 py-1.5 text-[10px] text-slate-300 text-center shadow-lg z-10 pointer-events-none">
                {a.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 opacity-35">
          {locked.map(a => (
            <div
              key={a.id}
              title={`${a.label}: ${a.desc}`}
              className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-[#1e1e2e] p-3 cursor-default"
            >
              <span className="text-2xl grayscale">{a.icon}</span>
              <span className="text-[9px] font-bold text-center text-slate-600 leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
