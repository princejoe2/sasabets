import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/markets'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure phone/name from registration metadata are saved to the profile.
      // This handles users who click the email link instead of entering the OTP
      // code in the browser — those users bypass the /api/auth/register call.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const admin = createAdminClient()
          const { data: profile } = await admin
            .from('profiles').select('phone, full_name').eq('id', user.id).single()

          const metaPhone = user.user_metadata?.phone as string | undefined
          const metaName  = user.user_metadata?.full_name as string | undefined
          const patch: Record<string, string> = {}

          if (metaPhone && (!profile?.phone || profile.phone === '')) patch.phone    = metaPhone
          if (metaName  && !profile?.full_name)                        patch.full_name = metaName

          if (Object.keys(patch).length > 0) {
            await admin.from('profiles').update(patch).eq('id', user.id)
          }
        }
      } catch { /* non-fatal — profile update is best-effort here */ }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=confirmation_failed`)
}
