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

// Read at call time so the BOM-strip function runs before the value is used.
// NEXT_PUBLIC_ vars are resolved at runtime on the server (not inlined by Turbopack).
const SB_URL  = e('NEXT_PUBLIC_SUPABASE_URL')
const SB_ANON = e('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export async function createClient() {
  const cookieStore = await cookies()
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
  // Read and strip at call time (not module load) to ensure BOM is removed
  // regardless of when/how webpack evaluates the module.
  const svc = e('SUPABASE_SERVICE_ROLE_KEY')
  return createSupabaseClient(SB_URL, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
