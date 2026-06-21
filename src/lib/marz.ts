const BASE = 'https://wallet.wearemarz.com/api/v1'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sabula256.com').replace(/^﻿/, '').trim()

const e = (k: string) => (process.env[k] ?? '').replace(/﻿/g, '').trim()

function headers() {
  const key    = e('MARZ_API_KEY')
  const secret = e('MARZ_API_SECRET')
  const creds  = Buffer.from(`${key}:${secret}`, 'utf8').toString('base64')
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
