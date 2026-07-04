import webpush from 'web-push'

let vapidSet = false
function ensureVapid() {
  if (vapidSet) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL ?? 'mailto:support@sabula256.com'
  if (!pub || !priv) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(email, pub, priv)
  vapidSet = true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

export type StoredSubscription = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<void> {
  ensureVapid()
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      icon: payload.icon ?? '/icon-192.png',
    }),
    { TTL: 86_400 },
  )
}
