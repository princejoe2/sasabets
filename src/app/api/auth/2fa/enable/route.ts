import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 5 attempts per minute per user
  const { allowed } = await rateLimit(`2fa_enable:${user.id}`, 5, 60)
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 })

  const { data: profile } = await admin
    .from('profiles')
    .select('totp_secret')
    .eq('id', user.id)
    .single()

  if (!profile?.totp_secret) return NextResponse.json({ error: 'Run setup first' }, { status: 400 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const valid = authenticator.verify({ token: code, secret: profile.totp_secret })
  if (!valid) return NextResponse.json({ error: 'Invalid code — try again' }, { status: 400 })

  await admin.from('profiles').update({ totp_enabled: true }).eq('id', user.id)
  return NextResponse.json({ success: true })
}
