import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import { buildTotpCookie } from '@/lib/totp-session'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 5 attempts per minute per user
  const { allowed } = await rateLimit(`2fa_admin:${user.id}`, 5, 60)
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 })

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, staff_role, totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin && !profile?.staff_role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!profile.totp_enabled || !profile.totp_secret) {
    return NextResponse.json({ error: 'TOTP not configured' }, { status: 400 })
  }

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const valid = authenticator.verify({ token: code, secret: profile.totp_secret })
  if (!valid) return NextResponse.json({ error: 'Invalid code — try again' }, { status: 400 })

  const cookie = buildTotpCookie(user.id)
  const res = NextResponse.json({ success: true })
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2])
  return res
}
