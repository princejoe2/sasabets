import { createBrowserClient } from '@supabase/ssr'

const stripBom = (s: string) => s.replace(/^﻿/, '')

export function createClient() {
  return createBrowserClient(
    stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    stripBom(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
  )
}
