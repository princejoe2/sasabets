const PESAPAL_API = process.env.PESAPAL_API_URL!
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY!
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET!

export async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_API}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.token) throw new Error(`Pesapal token error: ${JSON.stringify(data)}`)
  return data.token
}

export async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  const res = await fetch(`${PESAPAL_API}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'GET' }),
  })
  const data = await res.json()
  if (!data.ipn_id) throw new Error(`IPN registration error: ${JSON.stringify(data)}`)
  return data.ipn_id
}

export interface PesapalOrderRequest {
  reference: string
  amount: number
  currency?: string
  description: string
  callbackUrl: string
  ipnId: string
  phone: string
  firstName: string
  lastName?: string
}

export async function submitOrder(token: string, order: PesapalOrderRequest) {
  const res = await fetch(`${PESAPAL_API}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: order.reference,
      currency: order.currency ?? 'UGX',
      amount: order.amount,
      description: order.description,
      callback_url: order.callbackUrl,
      notification_id: order.ipnId,
      billing_address: {
        phone_number: order.phone,
        first_name: order.firstName,
        last_name: order.lastName ?? '',
      },
    }),
  })
  const data = await res.json()
  return data as { redirect_url: string; order_tracking_id: string; merchant_reference: string }
}

export async function getTransactionStatus(token: string, orderTrackingId: string) {
  const res = await fetch(
    `${PESAPAL_API}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }
  )
  return res.json()
}
