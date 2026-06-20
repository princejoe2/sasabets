import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Returns admin status and whether user has 2FA enabled.
// Called right after signInWithPassword to decide if TOTP step is needed.
export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ isAdmin: false, has2fa: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('is_admin, totp_enabled')
    .eq('id', userId)
    .single()

  return NextResponse.json({
    isAdmin: data?.is_admin ?? false,
    has2fa: data?.totp_enabled ?? false,
  })
}
