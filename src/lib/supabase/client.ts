import { createBrowserClient } from '@supabase/ssr'

// Hardcoded to bypass Vercel build cache serving BOM-corrupted NEXT_PUBLIC_ env var values.
// The anon key is intentionally public (NEXT_PUBLIC_) and safe to include in source.
const SUPABASE_URL = 'https://jsigphyrhgmpaydozjfa.supabase.co' + ''
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
