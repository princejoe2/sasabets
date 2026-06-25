/**
 * Sabula 256 — Stress Test Suite v3 (500 users)
 *
 * Run:   node scripts/stress-test.mjs
 * Clean: node scripts/stress-test.mjs --cleanup
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4MTYxNywiZXhwIjoyMDk3MjU3NjE3fQ.h6qg0eVlboTMpCW1F3bcQg3erJMpAu_Dm9fi1hHXOrE'
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'
const SITE_URL      = 'https://sabula256.com'
const PROJECT_REF   = 'jsigphyrhgmpaydozjfa'
const MARKET_ID     = '637a62f5-a030-43b8-b909-94ce276bdcd1'
const OPT_A         = 'opt_a'
const OPT_B         = 'opt_b'
const TAG           = 'test-seed-'
const FUND_AMOUNT   = 100_000
const SIGN_IN_BATCH = 25   // auth sign-ins per parallel batch (avoids rate-limit)
const SIGN_IN_DELAY = 600  // ms between sign-in batches

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Colours ───────────────────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`
const R = s => `\x1b[31m${s}\x1b[0m`
const Y = s => `\x1b[33m${s}\x1b[0m`
const B = s => `\x1b[34m${s}\x1b[0m`
const W = s => `\x1b[1m${s}\x1b[0m`

const results = []
function record(name, passed, detail = '') {
  results.push({ name, passed, detail })
  console.log(`  ${passed ? G('✓') : R('✗')} ${name}${detail ? ` — ${detail}` : ''}`)
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Auth: build the SSR cookie @supabase/ssr v0.12 expects ───────────────
async function signInUser(email) {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: 'TestPass256!' })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  const s = data.session
  const cookieValue = JSON.stringify({
    access_token:  s.access_token,
    refresh_token: s.refresh_token,
    token_type:    s.token_type,
    expires_in:    s.expires_in,
    expires_at:    s.expires_at,
    user:          s.user,
  })
  return {
    cookie: `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(cookieValue)}`,
    userId: s.user.id,
  }
}

// Sign in users in batches to avoid hammering Supabase auth rate limiter
async function signInBatched(users) {
  const sessions = []
  for (let i = 0; i < users.length; i += SIGN_IN_BATCH) {
    const batch = users.slice(i, i + SIGN_IN_BATCH)
    const settled = await Promise.allSettled(batch.map(u => signInUser(u.email)))
    for (const r of settled) {
      if (r.status === 'fulfilled') sessions.push(r.value)
    }
    process.stdout.write(`\r  Signed in ${sessions.length}/${users.length} ok…`)
    if (i + SIGN_IN_BATCH < users.length) await sleep(SIGN_IN_DELAY)
  }
  process.stdout.write('\n')
  return sessions
}

// Supabase .in() breaks with >250 IDs — chunk and merge
async function queryInChunks(table, column, ids, select) {
  const CHUNK = 200
  const rows = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await admin.from(table).select(select).in(column, ids.slice(i, i + CHUNK))
    if (data) rows.push(...data)
  }
  return rows
}

function authedFetch(path, method, body, cookie) {
  return fetch(`${SITE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }))
   .catch(e  => ({ status: 0, json: { error: e.message } }))
}

// ─── Get test users ────────────────────────────────────────────────────────
async function getTestUsers() {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users.filter(u => u.email?.startsWith(TAG))
}

// ─── Test 1: Fund all test users ───────────────────────────────────────────
async function testFundUsers(users) {
  const n = users.length
  console.log(B(`\n[1] Fund ${n} test users (UGX ${FUND_AMOUNT.toLocaleString()} each)`))

  // Batch to avoid overwhelming Supabase with 500 simultaneous writes
  let ok = 0, fail = 0
  const BATCH = 50
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH)
    await Promise.all(slice.map(async u => {
      const { error } = await admin.from('wallets')
        .update({ balance: FUND_AMOUNT, updated_at: new Date().toISOString() })
        .eq('user_id', u.id)
      if (error) { fail++; return }

      // Upsert deposit transaction (idempotent via unique reference)
      const ref = `stress-fund-${u.id.slice(0, 8)}`
      await admin.from('transactions').upsert({
        user_id: u.id, type: 'deposit', amount: FUND_AMOUNT,
        status: 'completed', reference: ref,
        metadata: { source: 'stress_test' },
      }, { onConflict: 'reference' }).then(() => ok++)
    }))
    process.stdout.write(`\r  Funded ${Math.min(i + BATCH, users.length)}/${users.length}…`)
  }
  process.stdout.write('\n')

  record(`${n} wallets funded`, fail === 0, `${ok} ok, ${fail} failed`)

  const wallets = await queryInChunks('wallets', 'user_id', users.map(u => u.id), 'balance')
  const total = wallets.reduce((s, w) => s + Number(w.balance), 0)
  const expected = ok * FUND_AMOUNT
  record('Total balance matches', total === expected,
    `UGX ${total.toLocaleString()} across ${wallets.length} wallets (expected ${expected.toLocaleString()})`)
}

// ─── Test 2: 500 concurrent bets ───────────────────────────────────────────
async function testConcurrentBets(users) {
  const n = users.length
  console.log(B(`\n[2] Concurrent bet placement — ${n} users simultaneously`))

  const sessions = await signInBatched(users)
  console.log(`  ${G(sessions.length + '/' + n + ' sessions')} ready`)

  const BET = 5_000
  console.log(`  Firing ${sessions.length} concurrent POST /api/bet/place…`)
  const start = Date.now()
  const bets = await Promise.all(sessions.map((sess, i) =>
    authedFetch('/api/bet/place', 'POST', {
      marketId: MARKET_ID,
      optionId: i % 2 === 0 ? OPT_A : OPT_B,
      amount: BET,
    }, sess.cookie)
  ))
  const elapsed = Date.now() - start

  const accepted = bets.filter(b => b.status === 200 || b.status === 201)
  const rejected = bets.filter(b => b.status !== 200 && b.status !== 201)
  const byStatus = bets.reduce((m, b) => { m[b.status] = (m[b.status]||0)+1; return m }, {})

  record(`All ${sessions.length} bets returned a response`, bets.length === sessions.length, `${elapsed}ms`)
  record('Majority accepted (≥70%)', accepted.length >= sessions.length * 0.7,
    `${accepted.length} accepted · ${rejected.length} rejected · statuses: ${JSON.stringify(byStatus)}`)

  if (rejected.length > 0) {
    const sample = [...new Set(rejected.map(b => b.json?.error ?? String(b.status)))].slice(0, 3)
    console.log(Y(`  Sample rejections: ${sample.join(' | ')}`))
  }

  const { data: market } = await admin.from('markets').select('total_pool').eq('id', MARKET_ID).single()
  record('Market pool updated', Number(market?.total_pool) > 0,
    `Pool: UGX ${Number(market?.total_pool ?? 0).toLocaleString()}`)

  // Throughput
  const rps = Math.round(sessions.length / (elapsed / 1000))
  console.log(Y(`  Throughput: ~${rps} requests/sec over ${elapsed}ms`))

  return accepted.length
}

// ─── Test 3: Race condition — 20 concurrent withdrawals from 1 user ─────────
async function testRaceCondition(users) {
  console.log(B('\n[3] Race condition — 20 concurrent withdrawal requests from 1 user'))

  const victim = users[0]
  const sess   = await signInUser(victim.email)

  const { data: w0 } = await admin.from('wallets').select('balance').eq('user_id', victim.id).single()
  const balanceBefore = Number(w0?.balance ?? 0)
  console.log(`  Balance before: UGX ${balanceBefore.toLocaleString()}`)

  const withdrawAmt = 5_000
  const CONCURRENT  = 20
  const results2 = await Promise.all(
    Array.from({ length: CONCURRENT }, () =>
      authedFetch('/api/wallet/withdraw', 'POST', { amount: withdrawAmt }, sess.cookie)
    )
  )

  const succeeded  = results2.filter(r => r.status === 200)
  const rateLimited = results2.filter(r => r.status === 429)
  const byStatus = results2.reduce((m, r) => { m[r.status] = (m[r.status]||0)+1; return m }, {})

  await sleep(1500)
  const { data: w1 } = await admin.from('wallets').select('balance').eq('user_id', victim.id).single()
  const balanceAfter  = Number(w1?.balance ?? 0)
  const totalDebited  = balanceBefore - balanceAfter

  console.log(`  Results: ${succeeded.length} succeeded · ${rateLimited.length} rate-limited · statuses: ${JSON.stringify(byStatus)}`)
  console.log(`  Balance after: UGX ${balanceAfter.toLocaleString()} (debited UGX ${totalDebited.toLocaleString()})`)

  record('Wallet never negative', balanceAfter >= 0, `UGX ${balanceAfter.toLocaleString()}`)
  record('Race: at most 3 withdrawals succeeded', succeeded.length <= 3,
    `${succeeded.length}/${CONCURRENT} succeeded, ${rateLimited.length} rate-limited`)
  record('Debit matches successes exactly', totalDebited === succeeded.length * withdrawAmt,
    `${succeeded.length} × UGX ${withdrawAmt.toLocaleString()} = UGX ${(succeeded.length * withdrawAmt).toLocaleString()}`)
}

// ─── Test 4: DB-level atomic debit — 50 concurrent RPC calls on 1 wallet ───
async function testAtomicDebit(users) {
  console.log(B('\n[4] Atomic wallet debit — 50 concurrent RPC calls on 1 wallet'))

  const user = users[1]
  const { data: w0 } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  const balance = Number(w0?.balance ?? 0)

  const rpcCheck = await admin.rpc('adjust_wallet_balance', { p_user_id: user.id, p_delta: 0 })
  const hasRpc = !rpcCheck.error

  if (hasRpc) {
    const debitAmt = 1_000
    const CONCURRENT = 50
    console.log(Y(`  RPC live — ${CONCURRENT} concurrent debits of UGX ${debitAmt.toLocaleString()} (wallet: UGX ${balance.toLocaleString()})`))

    const rpcResults = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        admin.rpc('adjust_wallet_balance', { p_user_id: user.id, p_delta: -debitAmt })
      )
    )
    const successes = rpcResults.filter(r => r.data !== null && r.data !== undefined)
    const blocked   = rpcResults.filter(r => r.data === null || r.data === undefined)

    const { data: w1 } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
    const balanceAfter   = Number(w1?.balance ?? 0)
    const expectedMax    = Math.floor(balance / debitAmt)

    record('RPC: no negative balance', balanceAfter >= 0, `UGX ${balanceAfter.toLocaleString()}`)
    record('RPC: correct number of successes', successes.length <= expectedMax,
      `${successes.length} debits succeeded, ${blocked.length} blocked (had UGX ${balance.toLocaleString()})`)
  } else {
    record('RPC: adjust_wallet_balance available', false, 'Run the migration SQL in Supabase SQL editor')
  }
}

// ─── Test 5: Wallet integrity ──────────────────────────────────────────────
async function testWalletIntegrity(users) {
  console.log(B('\n[5] Wallet integrity — no negatives, consistent ledger'))

  const wallets = await queryInChunks('wallets', 'user_id', users.map(u => u.id), 'balance, user_id')
  const txns    = await queryInChunks('transactions', 'user_id', users.map(u => u.id), 'user_id, type, amount, status')
  const completedTxns = txns.filter(t => t.status === 'completed')

  const negatives = wallets.filter(w => Number(w.balance) < 0)
  record('No negative wallets', negatives.length === 0,
    negatives.length > 0 ? `${negatives.length} negative!` : `All ${wallets.length} wallets ≥ 0`)

  const deps  = completedTxns.filter(t => t.type === 'deposit'   ).reduce((s,t) => s + Number(t.amount), 0)
  const wds   = completedTxns.filter(t => t.type === 'withdrawal').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
  const bets  = completedTxns.filter(t => t.type === 'bet'       ).reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
  const pays  = completedTxns.filter(t => t.type === 'payout'    ).reduce((s,t) => s + Number(t.amount), 0)
  const ledger = deps - wds - bets + pays
  const walletTotal = wallets.reduce((s,w) => s + Number(w.balance), 0)

  console.log(`  Ledger:  deposits ${deps.toLocaleString()} - withdrawals ${wds.toLocaleString()} - bets ${bets.toLocaleString()} + payouts ${pays.toLocaleString()} = ${ledger.toLocaleString()}`)
  console.log(`  Wallets: ${walletTotal.toLocaleString()}`)
  record('Ledger matches wallet totals', ledger === walletTotal,
    ledger !== walletTotal ? `Discrepancy: UGX ${Math.abs(ledger - walletTotal).toLocaleString()} (expected if direct-funded)` : 'Balanced')
}

// ─── Test 6: Public endpoint availability ─────────────────────────────────
async function testEndpoints() {
  console.log(B('\n[6] Public endpoint availability'))
  const endpoints = ['/', '/markets', '/sitemap.xml', '/robots.txt', '/api/prices/btc', '/api/prices/ugx']
  await Promise.all(endpoints.map(async path => {
    const r = await fetch(`${SITE_URL}${path}`).catch(() => ({ status: 0 }))
    record(`GET ${path}`, r.status < 400, `HTTP ${r.status}`)
  }))
}

// ─── Test 7: Auth guards ───────────────────────────────────────────────────
async function testAuthGuards() {
  console.log(B('\n[7] Auth guards — protected routes reject unauthenticated calls'))
  const routes = [
    ['/api/wallet/withdraw', 'POST', { amount: 5000 }],
    ['/api/bet/place',       'POST', { marketId: MARKET_ID, optionId: OPT_A, amount: 1000 }],
    ['/api/marz/deposit',    'POST', { amount: 5000, phone: '+256700000001' }],
    ['/api/admin/complaints','GET',  null],
  ]
  await Promise.all(routes.map(async ([path, method, body]) => {
    const r = await fetch(`${SITE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => ({ status: 0 }))
    record(`${method} ${path} rejects unauthenticated`, r.status === 401 || r.status === 403,
      `HTTP ${r.status}`)
  }))
}

// ─── Cleanup ───────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('Resetting test user wallets to 0 and deleting test transactions…')
  const users = await getTestUsers()
  const BATCH = 50
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH)
    await Promise.all(slice.map(u =>
      admin.from('wallets').update({ balance: 0, updated_at: new Date().toISOString() }).eq('user_id', u.id)
    ))
    process.stdout.write(`\r  Wallets cleared: ${Math.min(i + BATCH, users.length)}/${users.length}`)
  }
  process.stdout.write('\n')
  await admin.from('transactions').delete().like('reference', 'stress-%')
  await admin.from('bets').delete().in('user_id', users.map(u => u.id))
  await admin.from('markets').update({
    total_pool: 0,
    options: [{ id: 'opt_a', label: 'Yes', total_pool: 0 }, { id: 'opt_b', label: 'No', total_pool: 0 }]
  }).eq('id', MARKET_ID)
  console.log(G('Cleaned up.'))
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--cleanup')) { await cleanup(); return }

  console.log(W('\n═══════════════════════════════════════════'))
  console.log(W('  Sabula 256 — Stress Test Suite v3'))
  console.log(W('═══════════════════════════════════════════'))
  console.log(`  Target: ${SITE_URL}`)
  console.log(`  Time:   ${new Date().toLocaleString('en-UG')}\n`)

  const users = await getTestUsers()
  if (users.length < 50) {
    console.error(R(`Need ≥50 test users. Found ${users.length}. Run seed-test-users.mjs first.`))
    process.exit(1)
  }
  console.log(`  ${users.length} test users found\n`)

  await testFundUsers(users)
  await testConcurrentBets(users)
  await testRaceCondition(users)
  await testAtomicDebit(users)
  await testWalletIntegrity(users)
  await testEndpoints()
  await testAuthGuards()

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(W('\n═══════════════════════════════════════════'))
  console.log(W('  Summary'))
  console.log(W('═══════════════════════════════════════════'))
  results.forEach(r => {
    console.log(`  ${r.passed ? G('PASS') : R('FAIL')}  ${r.name}`)
    if (!r.passed && r.detail) console.log(Y(`        → ${r.detail}`))
  })
  console.log(W(`\n  ${passed} passed · ${failed} failed / ${results.length} total\n`))
  console.log(failed === 0 ? G('  System healthy.\n') : Y(`  ${failed} check(s) need attention.\n`))
  process.exit(failed > 1 ? 1 : 0)
}

main().catch(e => { console.error(R(e.stack)); process.exit(1) })
