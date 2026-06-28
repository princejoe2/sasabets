'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PushNotificationPrompt() {
  const supabase = createClient()
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPermission(Notification.permission)
    if (localStorage.getItem('push-dismissed')) setDismissed(true)

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  // Don't show if: no support, already granted, denied, dismissed, or not logged in
  if (!permission || permission === 'granted' || permission === 'denied' || dismissed || subscribed || !isLoggedIn) return null

  async function requestPermission() {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setSubscribed(true)
        // Wait for service worker to be ready (no-op if sw not registered)
        await navigator.serviceWorker.ready
        // Store that user opted in — silently ignore if push_enabled column doesn't exist
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('profiles').update({ push_enabled: true }).eq('id', user.id)
          }
        } catch {
          // Column may not exist yet — skip DB update
        }
      }
    } catch (err) {
      console.error('Push permission error:', err)
    }
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('push-dismissed', '1')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-xl shadow-violet-100/50 dark:border-violet-900/30 dark:bg-slate-900 dark:shadow-black/30 sm:left-auto sm:right-6 sm:bottom-6">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl dark:bg-violet-900/40">
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Get market alerts</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Get notified when markets close or you win
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={requestPermission}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500"
            >
              Enable
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 text-slate-300 hover:text-slate-500 dark:text-slate-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      {subscribed && (
        <div className="border-t border-slate-100 bg-emerald-50 px-4 py-2.5 dark:border-slate-800 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ Notifications enabled!</p>
        </div>
      )}
    </div>
  )
}
