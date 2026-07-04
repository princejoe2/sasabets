'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const output  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export default function PushNotificationPrompt() {
  const supabase = createClient()
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPermission(Notification.permission)
    if (localStorage.getItem('push-dismissed')) setDismissed(true)
    if (localStorage.getItem('push-subscribed')) setSubscribed(true)

    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])

  if (!permission || permission === 'granted' || permission === 'denied' || dismissed || subscribed || !isLoggedIn) return null

  async function requestPermission() {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return

      const sw   = await navigator.serviceWorker.ready
      const sub  = await sw.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      })

      const json  = sub.toJSON()
      const keys  = json.keys as { p256dh: string; auth: string }

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: json.endpoint,
          p256dh:   keys.p256dh,
          auth:     keys.auth,
        }),
      })

      localStorage.setItem('push-subscribed', '1')
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscription error:', err)
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
            Get notified when new markets open, yours settle, or you win
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
