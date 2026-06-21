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

// Supabase URL and anon key hardcoded (public values) to fully bypass Vercel BOM injection.
// NEXT_PUBLIC_ vars get inlined at build time by webpack before our e() can strip them.
const SB_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'

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
  // Read and strip at call time (not module load) to ensure BOM is removed
  // regardless of when/how webpack evaluates the module.
  const svc = e('SUPABASE_SERVICE_ROLE_KEY')
  return createSupabaseClient(SB_URL, svc, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
