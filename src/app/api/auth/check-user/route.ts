import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Derive userId from the active session — never trust the request body
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isAdmin: false, has2fa: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('is_admin, totp_enabled, suspended, suspend_reason')
    .eq('id', user.id)
    .single()

  if (data?.suspended) {
    return NextResponse.json({
      suspended: true,
      suspend_reason: data.suspend_reason ?? 'Your account has been suspended. Contact support.',
    })
  }

  return NextResponse.json({
    isAdmin: data?.is_admin ?? false,
    has2fa: data?.totp_enabled ?? false,
  })
}
