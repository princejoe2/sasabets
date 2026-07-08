'use client'
// Silently auto-subscribes logged-in users to push notifications on mount.
// No UI shown — permission dialog is the browser's native prompt.
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const out     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function autoSubscribe() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return
  if (localStorage.getItem('push-subscribed')) return
  if (Notification.permission === 'denied') return

  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const sw  = await navigator.serviceWorker.ready
    const sub = await sw.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    })

    const json = sub.toJSON()
    const keys = json.keys as { p256dh: string; auth: string }

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ endpoint: json.endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    })

    localStorage.setItem('push-subscribed', '1')
  } catch {
    // Silently ignore — user may have denied or browser may not support
  }
}

export default function PushNotificationPrompt() {
  useEffect(() => {
    // 2-second delay so the page settles before triggering the native dialog
    const t = setTimeout(autoSubscribe, 2000)
    return () => clearTimeout(t)
  }, [])

  return null
}
