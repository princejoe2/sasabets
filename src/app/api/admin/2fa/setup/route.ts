import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyTotpCookie, COOKIE_NAME } from '@/lib/totp-session'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin, totp_enabled').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // If 2FA is already active, rotating the secret requires proving possession of the
  // CURRENT factor (valid TOTP session cookie). Otherwise a stolen admin password
  // alone could reset 2FA and mint a fresh session via /enable.
  if (profile.totp_enabled === true) {
    const jar = await cookies()
    const totpCookie = jar.get(COOKIE_NAME)?.value
    if (!verifyTotpCookie(totpCookie, user.id)) {
      return NextResponse.json({ error: 'Current 2FA verification required to rotate secret' }, { status: 403 })
    }
  }

  const secret = authenticator.generateSecret()
  await admin.from('profiles').update({ totp_secret: secret }).eq('id', user.id)

  const label = `Sabula 256 Admin (${user.email})`
  const uri = authenticator.keyuri(label, 'Sabula 256', secret)
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 240, margin: 2 })

  return NextResponse.json({ secret, qrDataUrl })
}
