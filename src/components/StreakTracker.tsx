'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StreakTracker() {
  const [, setStreak] = useState(0)
  const [toast, setToast] = useState<{ msg: string; bonus: number } | null>(null)

  useEffect(() => {
    // Only run once per browser session
    if (sessionStorage.getItem('streak-checked')) return

    async function checkStreak() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      sessionStorage.setItem('streak-checked', '1')

      try {
        const res = await fetch('/api/streak', { method: 'POST' })
        const data = await res.json()

        // ok: false means no user / no profile / columns don't exist yet — degrade gracefully
        if (data.ok === false) return

        setStreak(data.streak ?? 0)

        if (!data.alreadyCheckedIn && data.streak > 1) {
          const milestoneMsg: Record<number, string> = {
            7:  '7-day streak! UGX 1,000 bonus added!',
            14: '14-day streak! UGX 2,000 bonus added!',
            30: '30-day streak! UGX 5,000 bonus added!',
          }
          const msg = milestoneMsg[data.streak] ?? `${data.streak}-day streak! Keep it up!`
          setToast({ msg, bonus: data.bonus ?? 0 })
          setTimeout(() => setToast(null), 5000)
        }
      } catch {
        // Network error or column missing — silent fail
      }
    }

    checkStreak()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {toast && (
        <div className="fixed top-20 left-1/2 z-[200] -translate-x-1/2 animate-streak-bounce-in">
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-5 py-3 shadow-xl shadow-orange-100/50 dark:border-orange-800/40 dark:bg-slate-900 dark:shadow-black/30">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{toast.msg}</p>
              {toast.bonus > 0 && (
                <p className="text-xs font-semibold text-emerald-600">
                  +UGX {toast.bonus.toLocaleString()} added to your wallet
                </p>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-300 hover:text-slate-500"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
