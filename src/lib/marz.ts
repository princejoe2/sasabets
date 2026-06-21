const BASE = 'https://wallet.wearemarz.com/api/v1'

// Strip BOM (U+FEFF, charCode 0xFEFF = 65279) that Vercel injects at the start of env var values.
// Using charCodeAt avoids any ambiguity with regex literal characters in source files.
const e = (k: string) => {
  const v = process.env[k] ?? ''
  return (v.charCodeAt(0) === 0xFEFF ? v.slice(1) : v).trim()
}

const SITE_URL = e('NEXT_PUBLIC_SITE_URL') || 'https://sabula256.com'

function headers() {
  // MARZ_AUTH_BASIC is the pre-computed base64 of "api_key:api_secret".
  // Storing it pre-encoded avoids BOM corruption during Buffer.from() encoding.
  const creds = e('MARZ_AUTH_BASIC')
  return {
    Authorization: `Basic ${creds}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function webhookUrl() {
  const secret = e('MARZ_WEBHOOK_SECRET')
  return `${SITE_URL}/api/marz/webhook${secret ? `?secret=${secret}` : ''}`
}

export interface MarzTransaction {
  uuid: string
  reference: string
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled'
  amount: { raw: number; formatted: string; currency: string }
}

export interface MarzResult {
  status: 'success' | 'error'
  message: string
  data: { transaction: MarzTransaction }
}

export async function collectMoney(opts: {
  amount: number
  phone_number: string
  reference: string
  description?: string
}): Promise<MarzResult> {
  const res = await fetch(`${BASE}/collect-money`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      amount: opts.amount,
      phone_number: opts.phone_number,
      country: 'UG',
      reference: opts.reference,
      description: opts.description ?? 'Sabula 256 deposit',
      callback_url: webhookUrl(),
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message ?? 'Collection failed')
  return data
}

export async function sendMoney(opts: {
  amount: number
  phone_number: string
  reference: string
  description?: string
}): Promise<MarzResult> {
  const res = await fetch(`${BASE}/send-money`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      amount: opts.amount,
      phone_number: opts.phone_number,
      country: 'UG',
      reference: opts.reference,
      description: opts.description ?? 'Sabula 256 withdrawal',
      callback_url: webhookUrl(),
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message ?? 'Send money failed')
  return data
}

export async function getCollectionStatus(marzUuid: string): Promise<MarzResult> {
  const res = await fetch(`${BASE}/collect-money/${marzUuid}`, { headers: headers() })
  return res.json()
}
