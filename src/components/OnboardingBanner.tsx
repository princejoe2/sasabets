'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type StepStatus = {
  hasAccount: boolean
  hasPhone: boolean
  hasDeposit: boolean
  hasBet: boolean
}

const DISMISSED_KEY = 'onboarding-dismissed'

export default function OnboardingBanner() {
  const [steps, setSteps]         = useState<StepStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    // Check session-level dismissal first
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true)
      setLoading(false)
      return
    }

    async function fetchState() {
      const supabase = createClient()

      // 1. Current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 2. Profile phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

      // 3. Has completed deposit
      const { count: depositCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'deposit')
        .eq('status', 'completed')

      // 4. Has placed a bet
      const { count: betCount } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setSteps({
        hasAccount: true,
        hasPhone:   !!(profile?.phone),
        hasDeposit: (depositCount ?? 0) > 0,
        hasBet:     (betCount ?? 0) > 0,
      })
      setLoading(false)
    }

    fetchState()
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  // Hide while loading, if dismissed, if not logged in, or if all steps complete
  if (loading || dismissed || !steps) return null
  if (steps.hasAccount && steps.hasPhone && steps.hasDeposit && steps.hasBet) return null

  const STEPS: {
    label: string
    done: boolean
    href: string
  }[] = [
    { label: 'Create account', done: steps.hasAccount, href: '/register'  },
    { label: 'Add phone',      done: steps.hasPhone,   href: '/profile'   },
    { label: 'First deposit',  done: steps.hasDeposit, href: '/wallet'    },
    { label: 'Place a bet',    done: steps.hasBet,     href: '/markets'   },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/30">

        {/* Steps */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <span className="self-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">
            Get started:
          </span>
          {STEPS.map((step) => {
            const chip = (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  step.done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900'
                }`}
              >
                {step.done ? (
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" className="fill-emerald-500" />
                    <path d="M3.5 6l1.8 1.8L8.5 4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-violet-400 dark:border-violet-500" />
                )}
                {step.label}
              </span>
            )

            return step.done ? (
              <span key={step.label}>{chip}</span>
            ) : (
              <Link key={step.label} href={step.href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-full">
                {chip}
              </Link>
            )
          })}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding banner"
          className="ml-1 shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-violet-400 transition-colors hover:bg-violet-200 hover:text-violet-700 dark:text-violet-500 dark:hover:bg-violet-900 dark:hover:text-violet-300"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

      </div>
    </div>
  )
}
