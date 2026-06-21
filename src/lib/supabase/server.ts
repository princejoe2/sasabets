import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Strip BOM and non-printable-ASCII from env var values.
// Vercel injects U+FEFF (65279) into values at runtime; undici rejects header chars > 255.
// Uses a loop + charCodeAt so SWC/webpack can't mangle the logic.
function e(key: string): string {
  const raw = process.env[key] ?? ''
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += raw[i]
  }
  return out.trim()
}

const SB_URL  = e('NEXT_PUBLIC_SUPABASE_URL')
const SB_ANON = e('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SB_SVC  = e('SUPABASE_SERVICE_ROLE_KEY')

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(SB_URL, SB_ANON, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

export function createAdminClient() {
  return createSupabaseClient(SB_URL, SB_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
