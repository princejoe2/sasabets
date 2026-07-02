const BASE = 'https://payments.relworx.com/api'

function stripBom(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

// Relworx requires E.164 with + prefix: +256XXXXXXXXX
function normaliseMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('256')) return `+${digits}`
  if (digits.startsWith('0')) return `+256${digits.slice(1)}`
  return `+256${digits}`
}

function headers() {
  const key = stripBom(process.env.RELWORX_API_KEY ?? '')
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/vnd.relworx.v2',
    'Content-Type': 'application/json',
  }
}

function accountNo() {
  return stripBom(process.env.RELWORX_ACCOUNT_NO ?? '')
}

export interface RelworxSendResult {
  success: boolean
  message: string
  internal_reference: string
}

export interface RelworxStatusResult {
  success: boolean
  status: string
  message: string
  request_status: string
  amount: number
  currency: string
  provider: string
  msisdn: string
  provider_transaction_id?: string
  completed_at?: string
}

export async function requestPayment(opts: {
  msisdn: string
  amount: number
  reference: string
  description?: string
}): Promise<RelworxSendResult> {
  const res = await fetch(`${BASE}/mobile-money/request-payment`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      account_no: accountNo(),
      reference: opts.reference,
      msisdn: normaliseMsisdn(opts.msisdn),
      currency: 'UGX',
      amount: opts.amount,
      description: opts.description ?? 'Sabula 256 deposit',
    }),
  })
  let data: Record<string, unknown> = {}
  try { data = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok || !data.success) {
    const msg = String(data.message ?? data.error ?? `HTTP ${res.status}`)
    throw new Error(`Relworx [${res.status}] ${msg}`)
  }
  return data as unknown as RelworxSendResult
}

export async function sendPayment(opts: {
  msisdn: string
  amount: number
  reference: string
  description?: string
}): Promise<RelworxSendResult> {
  const res = await fetch(`${BASE}/mobile-money/send-payment`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      account_no: accountNo(),
      reference: opts.reference,
      msisdn: normaliseMsisdn(opts.msisdn),
      currency: 'UGX',
      amount: opts.amount,
      description: opts.description ?? 'Sabula 256 withdrawal',
    }),
  })
  let data: Record<string, unknown> = {}
  try { data = await res.json() } catch { /* non-JSON body */ }
  if (!res.ok || !data.success) {
    const msg = String(data.message ?? data.error ?? `HTTP ${res.status}`)
    throw new Error(`Relworx send-payment [${res.status}] ${msg}`)
  }
  if (typeof data.internal_reference !== 'string' || !data.internal_reference) {
    throw new Error('Relworx send-payment: missing internal_reference in response')
  }
  return data as unknown as RelworxSendResult
}

export async function checkPaymentStatus(internalReference: string): Promise<RelworxStatusResult> {
  const url = new URL(`${BASE}/mobile-money/check-request-status`)
  url.searchParams.set('account_no', accountNo())
  url.searchParams.set('internal_reference', internalReference)
  const res = await fetch(url.toString(), { headers: headers() })
  return res.json()
}
