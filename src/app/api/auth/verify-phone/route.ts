import { NextRequest, NextResponse } from 'next/server'
import { verifyPhone } from '@/lib/marz'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const { allowed } = await rateLimit(`vp:${ip}`, 10, 60)  // 10 per minute per IP
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  const { phone } = await req.json()
  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
  }

  // Normalize to international format
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits

  const [result, dupeCheck] = await Promise.all([
    verifyPhone(digits),
    createAdminClient().from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('phone', digits),
  ])

  return NextResponse.json({
    valid: result.valid,
    provider: result.provider,
    phone: digits,
    available: (dupeCheck.count ?? 0) === 0,
  })
}
