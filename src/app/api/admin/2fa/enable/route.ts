import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import { buildTotpCookie } from '@/lib/totp-session'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, totp_secret')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!profile.totp_secret) return NextResponse.json({ error: 'Run setup first' }, { status: 400 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const valid = authenticator.verify({ token: code, secret: profile.totp_secret })
  if (!valid) return NextResponse.json({ error: 'Invalid code — try again' }, { status: 400 })

  // Mark TOTP as enabled
  await admin.from('profiles').update({ totp_enabled: true }).eq('id', user.id)

  // Set 8-hour session cookie
  const cookie = buildTotpCookie(user.id)
  const res = NextResponse.json({ success: true })
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2])
  return res
}
