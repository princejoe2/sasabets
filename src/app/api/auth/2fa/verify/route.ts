import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles')
    .select('totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!profile?.totp_enabled || !profile.totp_secret) {
    return NextResponse.json({ error: '2FA not configured' }, { status: 400 })
  }

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const valid = authenticator.verify({ token: code, secret: profile.totp_secret })
  if (!valid) return NextResponse.json({ error: 'Invalid code — try again' }, { status: 400 })

  return NextResponse.json({ success: true })
}
