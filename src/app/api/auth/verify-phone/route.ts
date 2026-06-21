import { NextRequest, NextResponse } from 'next/server'
import { verifyPhone } from '@/lib/marz'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
  }

  // Normalize to international format
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits

  const result = await verifyPhone(digits)

  return NextResponse.json({
    valid: result.valid,
    name: result.name,
    provider: result.provider,
    phone: digits,
  })
}
