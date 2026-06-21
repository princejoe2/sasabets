const BASE = 'https://wallet.wearemarz.com/api/v1'

// Strip BOM and non-printable-ASCII from env var values (Vercel injects U+FEFF at runtime).
// Uses charCodeAt loop so SWC/webpack can't mangle a regex character class.
function ascii(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

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
    // Sandbox mode: API can't verify — fall through and trust local regex
    if (data.status === 'sandbox') return { valid: true }
    if (data.status !== 'success') return { valid: false }
    return {
      valid: true,
      name: data.data?.name,
      provider: data.data?.provider,
    }
  } catch {
    // Network failure — don't block registration
    return { valid: true }
  }
}
