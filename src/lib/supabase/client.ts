import { createBrowserClient } from '@supabase/ssr'

// Strip any non-ASCII characters that could cause browser fetch header rejection
// (browsers enforce ISO-8859-1 on header values, rejecting anything > U+00FF)
function safeEnv(value: string | undefined): string {
  // eslint-disable-next-line no-control-regex
  return (value ?? '').trim().replace(/[^\x00-\x7F]/g, '')
}

export function createClient() {
  return createBrowserClient(
    safeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    safeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
