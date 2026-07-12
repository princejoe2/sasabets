/**
 * Pre-authenticates test users via admin magic-link flow (no password rate limit).
 * Saves JWT tokens to scripts/stress-tokens.json — valid for 1 hour.
 *
 * Run:  node --env-file=.env.local scripts/preauth-users.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://jsigphyrhgmpaydozjfa.supabase.co'
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_REF   = 'jsigphyrhgmpaydozjfa'
const TAG           = 'test-seed-'
const OUT_FILE      = 'scripts/stress-tokens.json'
const BATCH_SIZE    = 50   // parallel magic-link generations (no IP rate limit on admin API)
const BATCH_DELAY   = 100  // ms between batches

if (!ANON_KEY || !SERVICE_KEY) {
  console.error('Missing env vars. Run: node --env-file=.env.local scripts/preauth-users.mjs')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function getSession(userId, email) {
  // Generate a one-time magic link token via admin API (bypasses password rate limits)
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: 'https://sabula256.com' },
  })
  if (error) throw new Error(error.message)

  const actionUrl   = data?.properties?.action_link ?? ''
  const tokenParam  = new URL(actionUrl).searchParams.get('token')
  if (!tokenParam) throw new Error('No token in magic link URL')

  // Exchange token for session — don't follow redirects, grab hash fragment from Location header
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/verify?token=${tokenParam}&type=magiclink&redirect_to=https://sabula256.com`,
    { headers: { apikey: ANON_KEY }, redirect: 'manual' }
  )

  const location = res.headers.get('location') ?? ''
  const hash     = location.split('#')[1] ?? ''
  const params   = new URLSearchParams(hash)

  const access_token  = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const expires_at    = parseInt(params.get('expires_at') ?? '0', 10)

  if (!access_token) throw new Error(`No access_token in redirect: ${location.slice(0, 200)}`)

  return {
    userId,
    email,
    expiresAt: expires_at,
    cookie: `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify({
      access_token, refresh_token, token_type: 'bearer',
      expires_in: 3600, expires_at,
      user: { id: userId, email, aud: 'authenticated', role: 'authenticated' },
    }))}`,
  }
}

async function main() {
  console.log('Loading test users from Supabase…')
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error(error.message); process.exit(1) }

  const testUsers = users.filter(u => u.email?.startsWith(TAG))
  if (testUsers.length === 0) {
    console.error('No test users. Run: node --env-file=.env.local scripts/seed-test-users.mjs')
    process.exit(1)
  }
  console.log(`Found ${testUsers.length} test users. Generating sessions via magic-link admin API…\n`)

  const tokens = []
  const failed = []

  for (let i = 0; i < testUsers.length; i += BATCH_SIZE) {
    const batch = testUsers.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map(u => getSession(u.id, u.email)))

    results.forEach((r, j) => {
      if (r.status === 'fulfilled') tokens.push(r.value)
      else failed.push({ email: batch[j].email, err: r.reason?.message })
    })

    const done = Math.min(i + BATCH_SIZE, testUsers.length)
    process.stdout.write(`\r  ${done}/${testUsers.length} sessions ready (${failed.length} failed)…`)

    if (done < testUsers.length) await sleep(BATCH_DELAY)
  }

  process.stdout.write('\n\n')

  if (failed.length > 0) {
    console.log(`Failed (${failed.length}):`)
    failed.slice(0, 5).forEach(f => console.log(`  ${f.email}: ${f.err}`))
    if (failed.length > 5) console.log(`  …and ${failed.length - 5} more`)
    console.log()
  }

  writeFileSync(OUT_FILE, JSON.stringify({ savedAt: new Date().toISOString(), tokens }, null, 2))
  const expiry = tokens[0] ? new Date(tokens[0].expiresAt * 1000).toLocaleTimeString() : 'unknown'
  console.log(`✓  Saved ${tokens.length} tokens → ${OUT_FILE}`)
  console.log(`   Tokens expire at ~${expiry} (1 hour from now)`)
  console.log('\nNow run: node --env-file=.env.local scripts/stress-test.mjs')
}

main().catch(e => { console.error(e.message); process.exit(1) })
