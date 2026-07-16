import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import { buildTotpCookie, verifyTotpCookie, COOKIE_NAME } from '@/lib/totp-session'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!profile.totp_secret) return NextResponse.json({ error: 'Run setup first' }, { status: 400 })

  // If 2FA is already enabled, re-enrollment (binding a rotated secret) requires the
  // CURRENT TOTP session cookie — a stolen password alone must not be able to swap
  // in an attacker-controlled secret.
  if (profile.totp_enabled === true) {
    const jar = await cookies()
    const totpCookie = jar.get(COOKIE_NAME)?.value
    if (!verifyTotpCookie(totpCookie, user.id).valid) {
      return NextResponse.json({ error: 'Current 2FA verification required to rotate secret' }, { status: 403 })
    }
  }

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const valid = authenticator.verify({ token: code, secret: profile.totp_secret })
  if (!valid) return NextResponse.json({ error: 'Invalid code — try again' }, { status: 400 })

  // Generate new session ID and mark TOTP as enabled.
  const sessionId = crypto.randomUUID()
  await admin.from('profiles').update({ totp_enabled: true, admin_session_id: sessionId }).eq('id', user.id)

  const cookie = buildTotpCookie(user.id, sessionId)
  const res = NextResponse.json({ success: true })
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2])
  return res
}
