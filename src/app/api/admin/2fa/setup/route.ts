import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin, phone').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Generate a fresh secret each time setup is viewed
  const secret = authenticator.generateSecret()

  // Store as pending (totp_enabled stays false until confirmed)
  await admin.from('profiles').update({ totp_secret: secret }).eq('id', user.id)

  const label = `Sabula 256 Admin (+${profile.phone})`
  const uri = authenticator.keyuri(label, 'Sabula 256', secret)
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 240, margin: 2 })

  return NextResponse.json({ secret, qrDataUrl })
}
