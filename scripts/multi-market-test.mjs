/**
 * Multi-market concurrent bet test.
 *
 * Creates 10 fresh test users, gives each UGX 200,000,
 * then fires all bets simultaneously across different open markets.
 * Reports wallet drains, pool updates, race errors, and cleans up.
 *
 * Run: node --env-file=.env.local scripts/multi-market-test.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const NUM_USERS       = 10
const BETS_PER_USER   = 5
const STARTING_BAL    = 200_000
const G = s => `\x1b[32m${s}\x1b[0m`
const R = s => `\x1b[31m${s}\x1b[0m`
const Y = s => `\x1b[33m${s}\x1b[0m`
const B = s => `\x1b[34m${s}\x1b[0m`
const W = s => `\x1b[1m${s}\x1b[0m`
const fmt = n => Number(n).toLocaleString()
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// ── 1. Fetch open markets ─────────────────────────────────────────────────
async function getMarkets() {
  const { data, error } = await sb
    .from('markets')
    .select('id,title,options,total_pool')
    .eq('status', 'open')
  if (error) throw error
  // Only include markets with proper uuid option ids (skip updown opt-up/opt-down)
  return data.filter(m =>
    Array.isArray(m.options) &&
    m.options.length >= 2 &&
    m.options[0].id !== 'opt-up' &&
    m.options[0].id !== 'opt-down' &&
    m.options[0].id !== 'opt-yes' &&
    m.options[0].id !== 'opt-no'
  )
}

// ── 2. Create a user + wallet ─────────────────────────────────────────────
async function createUser(i) {
  const email = `mmtest-${i}-${Date.now()}@sabula-mmtest.invalid`
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: `MMTest User ${i}` },
  })
  if (error) throw new Error(`createUser ${i}: ${error.message}`)

  const userId = data.user.id
  await sb.from('profiles').upsert({ id: userId, full_name: `MMTest User ${i}` }, { onConflict: 'id' })
  const { error: we } = await sb.from('wallets').upsert(
    { user_id: userId, balance: STARTING_BAL, bonus_balance: 0 },
    { onConflict: 'user_id' }
  )
  if (we) throw new Error(`wallet upsert ${i}: ${we.message}`)
  return { userId, email, index: i }
}

// ── 3. Place bet via RPC ──────────────────────────────────────────────────
async function bet(userId, marketId, optionId, amount, tag) {
  const t0 = Date.now()
  const { data, error } = await sb.rpc('place_bet', {
    p_user_id:   userId,
    p_market_id: marketId,
    p_option_id: optionId,
    p_amount:    amount,
  })
  const ms = Date.now() - t0
  if (error)    return { ok: false, code: 'rpc_err', msg: error.message, ms, tag }
  if (data?.error) return { ok: false, code: data.error, msg: data.message ?? data.error, ms, tag }
  return { ok: true, balance: data?.new_balance, pool: data?.new_total, ms, tag }
}

// ── 4. Assign bets — each user gets BETS_PER_USER unique markets ──────────
function buildPlan(users, markets) {
  return users.flatMap(u => {
    const shuffled = [...markets].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, BETS_PER_USER).map(m => {
      const opt    = pick(m.options)
      const amount = rng(1_000, 15_000)
      return {
        userId:   u.userId,
        userName: `User${u.index}`,
        marketId: m.id,
        optionId: opt.id,
        amount,
        tag: `${W(`User${u.index}`)} → ${m.title.slice(0, 38)}… [${opt.label.slice(0, 6)}] UGX ${fmt(amount)}`,
      }
    })
  })
}

// ── 5. Cleanup ────────────────────────────────────────────────────────────
async function cleanup(userIds) {
  process.stdout.write('\n🧹  Cleaning up…')
  await Promise.all(userIds.map(id => sb.auth.admin.deleteUser(id)))
  console.log(G(` done (${userIds.length} users deleted)`))
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(W('\n══════════════════════════════════════════════════════'))
  console.log(W(`  SasaBets — Multi-Market Concurrent Bet Test`))
  console.log(W(`  ${NUM_USERS} users × ${BETS_PER_USER} markets = ${NUM_USERS * BETS_PER_USER} bets fired simultaneously`))
  console.log(W('══════════════════════════════════════════════════════\n'))

  // Load markets
  process.stdout.write('📋  Loading open markets… ')
  const markets = await getMarkets()
  console.log(G(`${markets.length} markets found`))
  console.log(`    (${markets.map(m => m.title.slice(0, 28)).slice(0, 5).join(', ')}…)\n`)

  // Create users
  process.stdout.write(`👤  Creating ${NUM_USERS} users… `)
  const users = await Promise.all(Array.from({ length: NUM_USERS }, (_, i) => createUser(i + 1)))
  console.log(G('done'))
  console.log(`    Starting balance: UGX ${fmt(STARTING_BAL)} each\n`)

  // Build bet plan
  const plan = buildPlan(users, markets)
  console.log(`🎯  Bet plan (${plan.length} bets across ${new Set(plan.map(p => p.marketId)).size} different markets):`)
  plan.forEach(p => console.log(`    ${p.tag}`))

  // Snapshot pool totals before
  const beforePools = Object.fromEntries(markets.map(m => [m.id, Number(m.total_pool)]))

  // ── FIRE ALL CONCURRENTLY ────────────────────────────────────────────────
  console.log(B(`\n🚀  Firing all ${plan.length} bets simultaneously…\n`))
  const t0 = Date.now()
  const results = await Promise.all(plan.map(p => bet(p.userId, p.marketId, p.optionId, p.amount, p.tag)))
  const elapsed = Date.now() - t0

  // ── RESULTS ──────────────────────────────────────────────────────────────
  console.log('── Per-bet results ──────────────────────────────────────────────')
  results.forEach((r, i) => {
    const icon = r.ok ? G('✅') : R('❌')
    const tail = r.ok
      ? `bal=UGX ${fmt(r.balance)}  pool=UGX ${fmt(r.pool)}  ${r.ms}ms`
      : `[${r.code}] ${r.msg}  ${r.ms}ms`
    console.log(`${icon}  ${plan[i].tag}`)
    console.log(`       ${tail}`)
  })

  const ok    = results.filter(r => r.ok)
  const fails = results.filter(r => !r.ok)
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)

  console.log('\n── Summary ──────────────────────────────────────────────────────')
  console.log(`  Total bets:   ${results.length}`)
  console.log(`  ${G('Succeeded:')}   ${ok.length}`)
  console.log(`  ${R('Failed:')}      ${fails.length}`)
  console.log(`  Wall-clock:   ${elapsed}ms`)
  console.log(`  Avg latency:  ${avgMs}ms`)

  if (fails.length) {
    console.log(Y('\n── Failure breakdown ───────────────────────────────────────────'))
    const codes = {}
    fails.forEach(r => { codes[r.code] = (codes[r.code] ?? 0) + 1 })
    Object.entries(codes).forEach(([c, n]) => console.log(Y(`  ${c}: ${n}x`)))
  }

  // ── WALLET STATE ─────────────────────────────────────────────────────────
  const { data: wallets } = await sb.from('wallets')
    .select('user_id,balance')
    .in('user_id', users.map(u => u.userId))

  console.log('\n── Wallet balances after ────────────────────────────────────────')
  wallets?.forEach((w, i) => {
    const spent = STARTING_BAL - Number(w.balance)
    const negative = Number(w.balance) < 0
    const icon = negative ? R('⚠ NEGATIVE') : G('ok')
    console.log(`  User${i + 1}: UGX ${fmt(w.balance)} remaining  (spent UGX ${fmt(spent)})  ${icon}`)
  })

  const anyNegative = wallets?.some(w => Number(w.balance) < 0)
  if (anyNegative) {
    console.log(R('\n  ⚠ WARNING: Negative wallet detected — race condition in debit logic!'))
  } else {
    console.log(G('\n  ✓ No negative wallets — atomic debit working correctly.'))
  }

  // ── MARKET POOL STATE ─────────────────────────────────────────────────────
  const activeMarketIds = [...new Set(plan.map(p => p.marketId))]
  const { data: mktAfter } = await sb.from('markets')
    .select('id,title,total_pool,options')
    .in('id', activeMarketIds)

  console.log('\n── Market pool changes ──────────────────────────────────────────')
  mktAfter?.sort((a, b) => Number(b.total_pool) - Number(a.total_pool)).forEach(m => {
    const before = beforePools[m.id] ?? 0
    const after  = Number(m.total_pool)
    const delta  = after - before
    const arrow  = delta > 0 ? G(`+UGX ${fmt(delta)}`) : Y('no change')
    const split  = m.options?.map(o => `${o.label.slice(0, 6)}: UGX ${fmt(o.total_pool)}`).join(' | ')
    console.log(`  ${m.title.slice(0, 45)}`)
    console.log(`    Pool: UGX ${fmt(before)} → ${G(`UGX ${fmt(after)}`)} (${arrow})`)
    console.log(`    Split: ${split}`)
  })

  const totalPoolAfter = mktAfter?.reduce((s, m) => s + Number(m.total_pool), 0) ?? 0
  const totalSpent     = wallets?.reduce((s, w) => s + (STARTING_BAL - Number(w.balance)), 0) ?? 0
  const diff           = Math.abs(totalPoolAfter - totalSpent)

  console.log('\n── Integrity check ──────────────────────────────────────────────')
  console.log(`  Total spent by users:  UGX ${fmt(totalSpent)}`)
  console.log(`  Total pool increase:   UGX ${fmt(totalPoolAfter)}`)
  console.log(`  Difference:            UGX ${fmt(diff)} ${diff === 0 ? G('(perfect)') : R('(discrepancy!)')}`)

  if (diff === 0) {
    console.log(G('\n  ✓ Ledger balanced — every UGX spent is accounted for in market pools.'))
  } else {
    console.log(R('\n  ⚠ Ledger imbalance — investigate place_bet RPC!'))
  }

  await cleanup(users.map(u => u.userId))

  console.log(W('\n══════════════════════════════════════════════════════'))
  console.log(ok.length === results.length
    ? G(`  All ${results.length} bets succeeded. System handles concurrent multi-market bets correctly.`)
    : fails.length > 0 && fails.every(f => f.code === 'too_many_bets' || f.code === 'position_limit' || f.code === 'surge_cap')
      ? Y(`  ${ok.length}/${results.length} bets succeeded. Failures are expected rate-limiting, not bugs.`)
      : R(`  ${fails.length} unexpected failures — see breakdown above.`)
  )
  console.log(W('══════════════════════════════════════════════════════\n'))
}

main().catch(e => { console.error(R('FATAL: ' + e.message)); process.exit(1) })
