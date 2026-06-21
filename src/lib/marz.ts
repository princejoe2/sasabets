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

// Uganda operator prefixes (NCC Uganda):
//   MTN:    076x 077x 078x 039x
//   Airtel: 070x 074x 075x
//   UTL:    071x
//   Africell/Lyca: 079x
// Accepts: 07XXXXXXXX | 039XXXXXXX | +256 equivalents
const UG_PHONE_RE = /^(\+256|256|0)(7\d{8}|39\d{7})$/

function detectProvider(intl: string): string {
  const n = intl.replace(/^\+256/, '')
  if (/^(76|77|78|39)\d/.test(n)) return 'MTN'
  if (/^(70|74|75)\d/.test(n)) return 'Airtel'
  if (/^71\d/.test(n)) return 'UTL'
  return 'Mobile Money'
}

export async function verifyPhone(phone_number: string): Promise<{
  valid: boolean
  name?: string
  provider?: string
}> {
  const raw = phone_number.replace(/[\s\-()]/g, '')
  if (!UG_PHONE_RE.test(raw)) return { valid: false }
  const provider = detectProvider(raw.startsWith('+') ? raw : '+256' + raw.replace(/^(256|0)/, ''))
  return { valid: true, provider }
}
