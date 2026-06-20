import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Strip BOM and whitespace — Vercel sometimes injects U+FEFF into env var values
const e = (key: string) => (process.env[key] ?? '').replace(/^﻿/, '').trim()

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
