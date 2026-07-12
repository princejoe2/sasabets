/**
 * Seed 500 test users via Supabase Admin API.
 * Run: node scripts/seed-test-users.mjs
 * Clean: node scripts/seed-test-users.mjs --cleanup
 */

// Run: node --env-file=.env.local scripts/seed-test-users.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set. Run: node --env-file=.env.local scripts/seed-test-users.mjs'); process.exit(1) }

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FIRST_NAMES = [
  'Amina','Brian','Caroline','David','Esther','Frank','Grace','Henry',
  'Irene','Joel','Kevin','Lydia','Moses','Nancy','Oscar','Patricia',
  'Quentin','Rebecca','Samuel','Tendo','Umar','Violet','William','Xolani',
  'Yvonne','Zara','Alex','Betty','Charles','Deborah','Edward','Fatuma',
  'George','Hannah','Isaac','Juliet','Kenneth','Lilian','Martin','Norah',
  'Oliver','Priscilla','Robert','Sarah','Thomas','Uthman','Vera','Walter',
  'Xavier','Yasmin',
]
const LAST_NAMES = [
  'Nakato','Ssemakula','Aber','Tumusiime','Namutebi','Byarugaba','Auma','Kasozi',
  'Nansubuga','Mubiru','Ochieng','Nassali','Wandera','Akello','Okello','Namukasa',
  'Ssali','Atim','Tusiime','Nakiyingi','Ssentamu','Apio','Mugisha','Kato',
  'Achieng','Nalwanga','Omara','Nanteza','Lule','Kiconco','Ssebukulu','Nambi',
  'Waiswa','Kyambadde','Ssekandi','Nalugo','Byarugaba','Nkurunziza','Kabanda','Atuhaire',
  'Birungi','Mwesige','Natukunda','Orach','Sserwadda','Kiggundu','Nabirye','Opio',
  'Ssenoga','Tumwine',
]

function fullName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`
}

// Fake UG MTN numbers — clearly synthetic, never clash with real numbers
function fakePhone(i) {
  // 76XXXXXXX pattern (9 digits) — all within MTN Uganda range
  const base = 760000000 + i
  return `256${base}`
}

const CLEANUP  = process.argv.includes('--cleanup')
const TAG      = 'test-seed-'
const TOTAL    = 1000
const BATCH    = 20   // users per batch (keeps trigger load manageable)
const DELAY_MS = 80   // ms between batches

async function cleanup() {
  console.log('Fetching test users to delete…')
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error(error); process.exit(1) }

  const testUsers = users.filter(u => u.email?.startsWith(TAG))
  if (testUsers.length === 0) { console.log('No test users found.'); return }

  console.log(`Deleting ${testUsers.length} test users…`)
  // Delete in parallel batches of 50
  for (let i = 0; i < testUsers.length; i += 50) {
    const slice = testUsers.slice(i, i + 50)
    await Promise.all(slice.map(u => admin.auth.admin.deleteUser(u.id)))
    process.stdout.write(`\r  ${Math.min(i + 50, testUsers.length)}/${testUsers.length} deleted`)
  }
  console.log(`\nDeleted ${testUsers.length} users.`)
}

async function seed() {
  // Find existing test users so we can skip them
  console.log('Checking existing test users…')
  const { data: { users: existing } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existingEmails = new Set(existing.filter(u => u.email?.startsWith(TAG)).map(u => u.email))
  console.log(`  ${existingEmails.size} already exist — skipping those\n`)

  console.log(`Creating up to ${TOTAL} test users (batch size ${BATCH})…\n`)
  let created = 0, skipped = 0, failed = 0

  for (let batch = 0; batch < Math.ceil(TOTAL / BATCH); batch++) {
    const start = batch * BATCH
    const end   = Math.min(start + BATCH, TOTAL)

    await Promise.all(
      Array.from({ length: end - start }, async (_, j) => {
        const i     = start + j
        const email = `${TAG}${i + 1}@sabula256test.invalid`
        const name  = fullName(i)
        const phone = fakePhone(i)

        if (existingEmails.has(email)) { skipped++; return }

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: 'TestPass256!',
          email_confirm: true,
          user_metadata: { full_name: name, phone },
        })

        if (error) {
          process.stdout.write(`[${i + 1}] FAIL ${email}: ${error.message}\n`)
          failed++
          return
        }

        await admin.from('profiles').update({ full_name: name, phone }).eq('id', data.user.id)
        process.stdout.write(`[${i + 1}] ✓ ${name}\n`)
        created++
      })
    )

    if (end < TOTAL) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (already existed), ${failed} failed.`)
  console.log('Run stress test: node scripts/stress-test.mjs')
  console.log('To clean up:    node scripts/seed-test-users.mjs --cleanup')
}

if (CLEANUP) {
  cleanup().catch(console.error)
} else {
  seed().catch(console.error)
}
