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
  // MARZ_AUTH_BASIC is the pre-encoded Basic auth value from the MarzPay dashboard.
  // Fall back to building it from key+secret if not set.
  const basic = ascii(process.env.MARZ_AUTH_BASIC ?? '')
  if (basic) return basic.startsWith('Basic ') ? basic : `Basic ${basic}`
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
  let data: Record<string, unknown> = {}
  try { data = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok || data.status !== 'success') {
    const msg = String(data.message ?? data.error ?? data.detail ?? `HTTP ${res.status}`)
    throw new Error(`MarzPay [${res.status}] ${msg}`)
  }
  return data as unknown as MarzResult
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
  let data: Record<string, unknown> = {}
  try { data = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok || data.status !== 'success') {
    const msg = String(data.message ?? data.error ?? data.detail ?? `HTTP ${res.status}`)
    throw new Error(`MarzPay send-money [${res.status}] ${msg}`)
  }
  const tx = (data as { data?: { transaction?: { uuid?: unknown } } })?.data?.transaction
  if (!tx || typeof tx.uuid !== 'string' || !tx.uuid) {
    throw new Error('MarzPay send-money: missing transaction uuid in response')
  }
  return data as unknown as MarzResult
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

export interface MarzBalance {
  available: number
  currency: string
}

export async function getMarzBalance(): Promise<MarzBalance> {
  const res = await fetch(`${BASE}/balance`, { headers: requestHeaders() })
  if (!res.ok) throw new Error(`MarzPay balance ${res.status}`)
  const data = await res.json()
  // API returns { data: { balance: { amount, currency } } } or { data: { available: { amount, currency } } }
  const bal = data?.data?.available ?? data?.data?.balance ?? data?.data ?? {}
  const amount = typeof bal.amount === 'number' ? bal.amount
    : typeof bal.available === 'number' ? bal.available
    : typeof data?.data?.amount === 'number' ? data.data.amount
    : 0
  return { available: amount, currency: bal.currency ?? 'UGX' }
}

export interface MarzStats {
  balance: MarzBalance
  totalCollected: number   // sum of successful inbound (deposits)
  totalDisbursed: number   // sum of successful outbound (withdrawals)
  recentTransactions: Array<{
    type: 'collection' | 'disbursement'
    amount: number
    status: string
    reference: string
    created_at: string
  }>
}

export async function getMarzStats(): Promise<MarzStats> {
  const [balRes, txnRes] = await Promise.allSettled([
    fetch(`${BASE}/balance`, { headers: requestHeaders() }),
    fetch(`${BASE}/transactions?per_page=50&sort=desc`, { headers: requestHeaders() }),
  ])

  let balance: MarzBalance = { available: 0, currency: 'UGX' }
  if (balRes.status === 'fulfilled' && balRes.value.ok) {
    try {
      const data = await balRes.value.json()
      const bal = data?.data?.available ?? data?.data?.balance ?? data?.data ?? {}
      const amount = typeof bal.amount === 'number' ? bal.amount
        : typeof data?.data?.amount === 'number' ? data.data.amount : 0
      balance = { available: amount, currency: bal.currency ?? 'UGX' }
    } catch { /* ignore */ }
  }

  let totalCollected = 0
  let totalDisbursed = 0
  const recentTransactions: MarzStats['recentTransactions'] = []

  if (txnRes.status === 'fulfilled' && txnRes.value.ok) {
    try {
      const data = await txnRes.value.json()
      const txns: Array<Record<string, unknown>> = data?.data?.transactions ?? data?.data ?? data?.transactions ?? []
      for (const t of txns) {
        const amt = Number((t.amount as Record<string, unknown>)?.raw ?? t.amount ?? 0)
        const status = String(t.status ?? '')
        const type = String(t.type ?? (t.direction === 'inbound' ? 'collection' : 'disbursement'))
        if (status === 'successful') {
          if (type.includes('collect') || type === 'inbound') totalCollected += amt
          else totalDisbursed += amt
        }
        recentTransactions.push({
          type: (type.includes('collect') || type === 'inbound') ? 'collection' : 'disbursement',
          amount: amt,
          status,
          reference: String(t.reference ?? t.uuid ?? ''),
          created_at: String(t.created_at ?? t.createdAt ?? ''),
        })
      }
    } catch { /* ignore */ }
  }

  return { balance, totalCollected, totalDisbursed, recentTransactions }
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
