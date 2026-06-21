const BASE = 'https://wallet.wearemarz.com/api/v1'

// Strip everything outside printable ASCII (0x20–0x7E).
// This removes Vercel's BOM injection (U+FEFF = 65279) from env var values
// regardless of where in the string it appears.
const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '').trim()

const SITE_URL = ascii(process.env.NEXT_PUBLIC_SITE_URL ?? '') || 'https://sabula256.com'

function authHeader(): string {
  const key    = ascii(process.env.MARZ_API_KEY    ?? '')
  const secret = ascii(process.env.MARZ_API_SECRET ?? '')
  const b64    = Buffer.from(`${key}:${secret}`).toString('base64')
  return `Basic ${b64}`
}

function webhookUrl(): string {
  const secret = ascii(process.env.MARZ_WEBHOOK_SECRET ?? '')
  return `${SITE_URL}/api/marz/webhook${secret ? `?secret=${secret}` : ''}`
}

// Encode body as ArrayBuffer to skip undici's ByteString validation on string bodies.
function jsonBody(obj: unknown): ArrayBuffer {
  const str = JSON.stringify(obj)
  const buf = Buffer.from(str, 'utf8')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export interface MarzTransaction {
  uuid: string
  reference: string
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'sandbox'
  amount: { raw: number; formatted: string; currency: string }
}

export interface MarzResult {
  status: 'success' | 'error'
  message: string
  data: { transaction: MarzTransaction }
}

function requestHeaders() {
  return {
    Authorization: authHeader(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export async function collectMoney(opts: {
  amount: number
  phone_number: string
  reference: string
  description?: string
}): Promise<MarzResult> {
  const res = await fetch(`${BASE}/collect-money`, {
    method: 'POST',
    headers: requestHeaders(),
    body: jsonBody({
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
    headers: requestHeaders(),
    body: jsonBody({
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
  const res = await fetch(`${BASE}/collect-money/${marzUuid}`, {
    headers: requestHeaders(),
  })
  return res.json()
}

export async function verifyPhone(phone_number: string): Promise<{
  valid: boolean
  name?: string
  provider?: string
}> {
  try {
    const res = await fetch(`${BASE}/verify-phone`, {
      method: 'POST',
      headers: requestHeaders(),
      body: jsonBody({ phone_number, country: 'UG' }),
    })
    const data = await res.json()
    if (data.status !== 'success') return { valid: false }
    return {
      valid: true,
      name: data.data?.name,
      provider: data.data?.provider,
    }
  } catch {
    return { valid: false }
  }
}
