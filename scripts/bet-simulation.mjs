/**
 * Sabula 256 — Financial Integrity Simulation (1000 users, 10 markets)
 *
 * 1000 users × 10 markets = 10,000 bets
 * Bet amounts: 10 tiers (1k–10k UGX) cycling by user index
 * Option split: varies per market (not always 50/50) — tests asymmetric pools
 * Verifies per-market rake transaction is inserted and accumulates correctly
 *
 * Run:     node scripts/bet-simulation.mjs
 * Cleanup: node scripts/bet-simulation.mjs --cleanup
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4MTYxNywiZXhwIjoyMDk3MjU3NjE3fQ.h6qg0eVlboTMpCW1F3bcQg3erJMpAu_Dm9fi1hHXOrE'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Config ────────────────────────────────────────────────────────────────
const TAG           = 'test-seed-'
const NUM_MARKETS   = 10
const RAKE_PCT      = 0.08
const FUND_AMOUNT   = 110_000  // covers 10 bets × max 10,000 each with buffer
const MARKET_PREFIX = 'sim-market-'

// 10 bet tiers cycling by user index — tests varied pool composition
function betAmount(userIdx) {
  return (userIdx % 10 + 1) * 1_000  // 1k, 2k, 3k … 10k UGX
}

// Option split varies per market — creates asymmetric pools
// market 0: 70/30   market 1: 40/60   market 2: 60/40   market 3: 50/50
// market 4: 80/20   market 5: 55/45   market 6: 45/55   market 7: 65/35
// market 8: 35/65   market 9: 50/50
const OPT_A_THRESHOLDS = [700, 400, 600, 500, 800, 550, 450, 650, 350, 500]
function betOption(userIdx, marketIdx) {
  return (userIdx % 1000) < OPT_A_THRESHOLDS[marketIdx] ? 'opt_a' : 'opt_b'
}

// Markets 0,2,4,6,8 → opt_a wins; 1,3,5,7,9 → opt_b wins
function winningOption(marketIdx) {
  return marketIdx % 2 === 0 ? 'opt_a' : 'opt_b'
}

// ─── Colours ───────────────────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`
const R = s => `\x1b[31m${s}\x1b[0m`
const Y = s => `\x1b[33m${s}\x1b[0m`
const B = s => `\x1b[34m${s}\x1b[0m`
const W = s => `\x1b[1m${s}\x1b[0m`
const C = s => `\x1b[36m${s}\x1b[0m`

const checks = []
function pass(name, detail = '') { checks.push({ ok: true,  name, detail }); console.log(`  ${G('✓')} ${name}${detail ? ` — ${detail}` : ''}`) }
function fail(name, detail = '') { checks.push({ ok: false, name, detail }); console.log(`  ${R('✗')} ${name}${detail ? ` — ${detail}` : ''}`) }
function check(cond, name, detail = '') { if (cond) pass(name, detail); else fail(name, detail) }

// Chunk .in() queries — Supabase breaks at >250 IDs
async function inChunks(table, col, ids, select, extraFilters) {
  const CHUNK = 200
  const rows  = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    let q = admin.from(table).select(select).in(col, ids.slice(i, i + CHUNK))
    if (extraFilters) q = extraFilters(q)
    const { data } = await q
    if (data) rows.push(...data)
  }
  return rows
}

// ─── Phase 0: Get test users ────────────────────────────────────────────────
async function getUsers() {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const testUsers = users.filter(u => u.email?.startsWith(TAG))
  if (testUsers.length < 100) throw new Error(`Only ${testUsers.length} test users found — run seed-test-users.mjs first`)
  return testUsers
}

// ─── Phase 1: Fund users ────────────────────────────────────────────────────
async function fundUsers(users) {
  console.log(B(`\n[1] Funding ${users.length} users — UGX ${FUND_AMOUNT.toLocaleString()} each`))
  const BATCH = 50
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH)
    await Promise.all(slice.map(u =>
      admin.from('wallets').update({ balance: FUND_AMOUNT, updated_at: new Date().toISOString() }).eq('user_id', u.id)
    ))
    process.stdout.write(`\r  Funded ${Math.min(i + BATCH, users.length)}/${users.length}…`)
  }
  process.stdout.write('\n')

  const wallets = await inChunks('wallets', 'user_id', users.map(u => u.id), 'balance')
  const total   = wallets.reduce((s, w) => s + Number(w.balance), 0)
  const expected = users.length * FUND_AMOUNT
  check(total === expected, 'Wallets funded correctly', `UGX ${total.toLocaleString()} / ${expected.toLocaleString()}`)
  return total
}

// ─── Phase 2: Create markets ─────────────────────────────────────────────────
async function createMarkets() {
  console.log(B(`\n[2] Creating ${NUM_MARKETS} test markets`))
  await admin.from('markets').delete().like('title', `${MARKET_PREFIX}%`)

  const marketIds = []
  for (let i = 0; i < NUM_MARKETS; i++) {
    const { data, error } = await admin.from('markets').insert({
      title:       `${MARKET_PREFIX}${i + 1}`,
      description: `Simulation market ${i + 1}. Winner: ${winningOption(i)}. Split: ${OPT_A_THRESHOLDS[i] / 10}% opt_a.`,
      status:      'open',
      options:     [{ id: 'opt_a', label: 'Yes', total_pool: 0 }, { id: 'opt_b', label: 'No', total_pool: 0 }],
      total_pool:  0,
      rake_pct:    RAKE_PCT,
      closes_at:   new Date(Date.now() + 3_600_000).toISOString(),
    }).select('id').single()
    if (error) throw new Error(`Market insert failed: ${error.message}`)
    marketIds.push(data.id)
    const split = `${OPT_A_THRESHOLDS[i] / 10}/${(1000 - OPT_A_THRESHOLDS[i]) / 10}`
    console.log(`  Market ${i + 1} → ${data.id.slice(0,8)} | winner: ${winningOption(i)} | split: ${split}%`)
  }
  return marketIds
}

// ─── Phase 3: Place bets ─────────────────────────────────────────────────────
async function placeBets(users, marketIds) {
  console.log(B(`\n[3] Placing ${users.length * NUM_MARKETS} bets — ${users.length} users × ${NUM_MARKETS} markets`))

  // Compute each user's total bet across all markets (for wallet deduction)
  const userTotalBet = {}
  for (const u of users) userTotalBet[u.id] = 0

  let totalBetVol = 0

  for (let mi = 0; mi < NUM_MARKETS; mi++) {
    const marketId = marketIds[mi]
    const mBets    = users.map((u, ui) => ({
      userId: u.id, option: betOption(ui, mi), amount: betAmount(ui), userIdx: ui,
    }))

    process.stdout.write(`  Market ${mi + 1}/${NUM_MARKETS}: inserting ${mBets.length} bets…`)

    // Insert bets in chunks of 200
    for (let i = 0; i < mBets.length; i += 200) {
      const slice = mBets.slice(i, i + 200)
      const { error } = await admin.from('bets').insert(slice.map(b => ({
        user_id: b.userId, market_id: marketId, option_id: b.option,
        amount: b.amount, potential_payout: 0, status: 'active',
        placed_at: new Date().toISOString(),
      })))
      if (error) throw new Error(`Bet insert m${mi}: ${error.message}`)
    }

    // Insert bet transactions in chunks of 200
    for (let i = 0; i < mBets.length; i += 200) {
      const slice = mBets.slice(i, i + 200)
      await admin.from('transactions').insert(slice.map(b => ({
        user_id:   b.userId,
        type:      'bet',
        amount:    -b.amount,
        status:    'completed',
        reference: `sim-bet-m${mi}-u${b.userIdx}`,
        metadata:  { marketId, option: b.option, source: 'bet_simulation' },
      })))
    }

    const optA = mBets.filter(b => b.option === 'opt_a').reduce((s, b) => s + b.amount, 0)
    const optB = mBets.filter(b => b.option === 'opt_b').reduce((s, b) => s + b.amount, 0)
    const total = optA + optB
    totalBetVol += total

    await admin.from('markets').update({
      total_pool: total,
      options: [{ id: 'opt_a', label: 'Yes', total_pool: optA }, { id: 'opt_b', label: 'No', total_pool: optB }],
    }).eq('id', marketId)

    for (const b of mBets) userTotalBet[b.userId] += b.amount

    console.log(` Pool: ${total.toLocaleString()} (A=${optA.toLocaleString()} | B=${optB.toLocaleString()})`)
  }

  // Deduct all bets from wallets in bulk
  process.stdout.write(`  Deducting bets from ${users.length} wallets…`)
  const BATCH = 50
  for (let i = 0; i < users.length; i += BATCH) {
    const slice = users.slice(i, i + BATCH)
    await Promise.all(slice.map(u =>
      admin.from('wallets').update({
        balance: FUND_AMOUNT - userTotalBet[u.id],
        updated_at: new Date().toISOString(),
      }).eq('user_id', u.id)
    ))
    process.stdout.write(`\r  Deducting bets from wallets… ${Math.min(i + BATCH, users.length)}/${users.length}`)
  }
  process.stdout.write('\n')
  console.log(`  Total bet volume: UGX ${totalBetVol.toLocaleString()}`)

  return { userTotalBet, totalBetVol }
}

// ─── Phase 4: Settle markets (batched — one bulk update per market) ──────────
async function settleMarkets(marketIds) {
  console.log(B(`\n[4] Settling ${NUM_MARKETS} markets (batched)`))

  const { data: adminProfiles } = await admin.from('profiles').select('id').eq('is_admin', true).limit(1)
  const adminProfile = adminProfiles?.[0]
  if (!adminProfile) throw new Error('No admin profile found — rake transactions cannot be inserted')

  const results = []
  for (let mi = 0; mi < NUM_MARKETS; mi++) {
    const marketId = marketIds[mi]
    const winner   = winningOption(mi)
    process.stdout.write(`  Market ${mi + 1}: settling → ${winner} wins… `)

    const { data: rows } = await admin.from('markets').select('*').eq('id', marketId).limit(1)
    const market = rows?.[0]
    if (!market) throw new Error(`Market ${mi + 1} not found`)

    const opts        = market.options
    const winningOpt  = opts.find(o => o.id === winner)
    const totalPool   = Number(market.total_pool)
    const rakePct     = Number(market.rake_pct ?? RAKE_PCT)
    const prizePool   = totalPool * (1 - rakePct)
    const winningPool = Number(winningOpt.total_pool)
    const rake        = totalPool * rakePct

    // Fetch all winning bets
    const { data: winningBets } = await admin.from('bets')
      .select('id, user_id, amount').eq('market_id', marketId).eq('option_id', winner).eq('status', 'active').limit(10000)

    let totalPaid = 0, winnersCount = 0

    if (winningBets?.length > 0 && winningPool > 0) {
      // Compute per-winner payouts
      const payouts = winningBets.map(bet => ({
        betId:   bet.id,
        userId:  bet.user_id,
        betAmt:  Number(bet.amount),
        payout:  (Number(bet.amount) / winningPool) * prizePool,
      }))
      totalPaid     = payouts.reduce((s, p) => s + p.payout, 0)
      winnersCount  = payouts.length

      // 1. Bulk-update all winning bets (chunks of 200)
      for (let i = 0; i < payouts.length; i += 200) {
        const slice = payouts.slice(i, i + 200)
        // Supabase doesn't support per-row upsert values easily, so update each bet's settled_payout
        // via upsert on id — batch all ids as won, then update settled_payout per chunk
        await Promise.all(slice.map(p =>
          admin.from('bets').update({ status: 'won', settled_payout: p.payout }).eq('id', p.betId)
        ))
      }

      // 2. Bulk insert all payout transactions (chunks of 200)
      for (let i = 0; i < payouts.length; i += 200) {
        const slice = payouts.slice(i, i + 200)
        const { error: txnErr } = await admin.from('transactions').insert(
          slice.map(p => ({
            user_id:   p.userId,
            type:      'payout',
            amount:    p.payout,
            status:    'completed',
            reference: `sim-payout-m${mi}-bet-${p.betId}`,
            metadata:  { marketId, winningOptionId: winner, betId: p.betId, market_title: market.title, stake: p.betAmt },
          }))
        )
        if (txnErr) console.error(`\n  Payout txn insert error m${mi+1}: ${txnErr.message}`)
      }

      // 3. Credit wallets in parallel batches using adjust_wallet_balance RPC
      const BATCH = 50
      for (let i = 0; i < payouts.length; i += BATCH) {
        const slice = payouts.slice(i, i + BATCH)
        await Promise.all(slice.map(p =>
          admin.rpc('adjust_wallet_balance', { p_user_id: p.userId, p_delta: p.payout })
        ))
      }
    }

    // 4. Mark losers in one update
    await admin.from('bets').update({ status: 'lost' })
      .eq('market_id', marketId).eq('status', 'active').neq('option_id', winner)

    // 5. Insert rake transaction
    if (rake > 0) {
      const { error: rakeErr } = await admin.from('transactions').insert({
        user_id:   adminProfile.id,
        type:      'rake',
        amount:    rake,
        status:    'completed',
        reference: `rake-${marketId}`,
        metadata:  { marketId, market_title: market.title, totalPool, rakePct, winningOptionId: winner },
      })
      if (rakeErr) console.error(`\n  Rake txn insert error m${mi+1}: ${rakeErr.message}`)
    }

    // 6. Finalise market
    await admin.from('markets').update({
      status: 'settled', winning_option_id: winner, settled_at: new Date().toISOString(),
    }).eq('id', marketId)

    console.log(`done — ${winnersCount} paid UGX ${Math.round(totalPaid).toLocaleString()} | rake UGX ${Math.round(rake).toLocaleString()}`)
    results.push({ marketId, winner, totalPool, prizePool, winningPool, rake, totalPaid, winnersCount })
  }
  return results
}

// ─── Phase 5: Verify ─────────────────────────────────────────────────────────
async function verify(users, settlementResults, initialTotal, betsData) {
  console.log(B('\n[5] Verifying financial integrity'))

  const userIds = users.map(u => u.id)
  const wallets = await inChunks('wallets', 'user_id', userIds, 'user_id, balance')
  const walletMap = Object.fromEntries(wallets.map(w => [w.user_id, Number(w.balance)]))

  let totalRakeActual = 0
  let marketPassing   = 0
  console.log('')

  for (let mi = 0; mi < settlementResults.length; mi++) {
    const r = settlementResults[mi]

    // Check settled_payout on winning bets directly
    const { data: settledBets } = await admin.from('bets')
      .select('amount, settled_payout').eq('market_id', r.marketId).eq('status', 'won').limit(10000)

    let payoutErrors = 0
    for (const bet of settledBets ?? []) {
      const expected = (Number(bet.amount) / r.winningPool) * r.prizePool
      const actual   = Number(bet.settled_payout)
      if (Math.abs(actual - expected) > 0.01) payoutErrors++
    }

    const rakeActual   = r.totalPool - r.totalPaid
    const rakeExpected = r.totalPool * RAKE_PCT
    const rakeOk       = Math.abs(rakeActual - rakeExpected) < 1
    const payoutsOk    = payoutErrors === 0
    const prizePoolOk  = Math.abs(r.totalPaid - r.prizePool) < 1

    const split = OPT_A_THRESHOLDS[mi] / 10
    console.log(`  Market ${mi + 1} (${r.winner} wins | ${split}/${100 - split}% split):`)
    console.log(`    Pool=${r.totalPool.toLocaleString()} | Prize=${Math.round(r.prizePool).toLocaleString()} | Rake=${Math.round(rakeActual).toLocaleString()} (${(rakeActual / r.totalPool * 100).toFixed(2)}%)`)
    console.log(`    Winners: ${r.winnersCount} | Payout errors: ${payoutErrors}`)
    if (rakeOk && payoutsOk && prizePoolOk) { marketPassing++; console.log(`    ${G('All math correct')}`) }
    else console.log(`    ${R(`Issues: rake=${rakeOk?'ok':'FAIL'} payouts=${payoutsOk?'ok':'FAIL'} prizePool=${prizePoolOk?'ok':'FAIL'}`)}`)

    totalRakeActual += rakeActual
  }

  check(marketPassing === NUM_MARKETS, `All ${NUM_MARKETS} markets: correct rake & payouts`, `${marketPassing}/${NUM_MARKETS} clean`)

  // Check rake transactions were inserted correctly
  const { data: rakeTxns } = await admin.from('transactions')
    .select('amount, reference, metadata')
    .eq('type', 'rake').eq('status', 'completed')
    .like('reference', 'rake-%')
  const rakeTxnTotal = (rakeTxns ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const rakeInDb = settlementResults.reduce((s, r) => s + r.totalPool * RAKE_PCT, 0)
  check(
    Math.abs(rakeTxnTotal - rakeInDb) < 1,
    `Rake transactions inserted for all ${NUM_MARKETS} markets`,
    `DB rake txns: UGX ${Math.round(rakeTxnTotal).toLocaleString()} | expected: UGX ${Math.round(rakeInDb).toLocaleString()}`
  )

  // Conservation law
  const finalTotal = wallets.reduce((s, w) => s + Number(w.balance), 0)
  const conserved  = Math.abs((initialTotal - totalRakeActual) - finalTotal) < NUM_MARKETS
  const negatives  = wallets.filter(w => Number(w.balance) < 0)

  console.log('')
  check(negatives.length === 0,   'No negative wallets', `All ${wallets.length} wallets ≥ 0`)
  check(conserved, 'Conservation law holds',
    `Initial: ${initialTotal.toLocaleString()} | Rake: ${Math.round(totalRakeActual).toLocaleString()} | Final: ${Math.round(finalTotal).toLocaleString()}`)

  const rakeAccuracy = Math.abs(totalRakeActual - betsData.totalBetVol * RAKE_PCT) / (betsData.totalBetVol * RAKE_PCT) < 0.001
  check(rakeAccuracy, `Rake is exactly ${(RAKE_PCT * 100).toFixed(0)}% of bet volume`,
    `Expected UGX ${Math.round(betsData.totalBetVol * RAKE_PCT).toLocaleString()}, got UGX ${Math.round(totalRakeActual).toLocaleString()}`)

  return { finalTotal, totalRakeActual, rakeTxnTotal }
}

// ─── Phase 6: Admin summary ───────────────────────────────────────────────────
async function adminSummary(users) {
  console.log(B('\n[6] Admin Funds page snapshot'))
  const userIds  = users.map(u => u.id)
  const txns     = await inChunks('transactions', 'user_id', userIds, 'type, amount, status')
  const wallets  = await inChunks('wallets',      'user_id', userIds, 'balance')
  const rakeTxns = await admin.from('transactions').select('amount').eq('type', 'rake').eq('status', 'completed')

  const completed      = txns.filter(t => t.status === 'completed')
  const totalBetVol    = completed.filter(t => t.type === 'bet').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)
  const totalPaidOut   = completed.filter(t => t.type === 'payout').reduce((s,t) => s+Number(t.amount), 0)
  const totalUserFunds = wallets.reduce((s,w) => s+Number(w.balance), 0)
  const totalRake      = (rakeTxns.data ?? []).reduce((s,t) => s+Number(t.amount), 0)

  const rows = [
    ['Total Bet Volume',  totalBetVol],
    ['Total Paid Out',    totalPaidOut],
    ['Rake Collected',    totalRake],
    ['User Funds on Hand',totalUserFunds],
  ]
  for (const [label, val] of rows) {
    console.log(`  ${C(label.padEnd(22))} UGX ${Math.round(val).toLocaleString()}`)
  }
  check(totalRake > 0,      'Rake > 0 in admin page', `UGX ${Math.round(totalRake).toLocaleString()}`)
  check(totalPaidOut > 0,   'Payouts visible',        `UGX ${Math.round(totalPaidOut).toLocaleString()}`)
  check(totalUserFunds >= 0,'User funds non-negative', `UGX ${Math.round(totalUserFunds).toLocaleString()}`)
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('Cleaning up simulation data…')
  const { data: markets } = await admin.from('markets').select('id').like('title', `${MARKET_PREFIX}%`)
  if (!markets?.length) { console.log('No sim markets found.'); return }
  const ids = markets.map(m => m.id)
  await admin.from('bets').delete().in('market_id', ids)
  await admin.from('transactions').delete().like('reference', 'sim-bet-%')
  await admin.from('transactions').delete().like('reference', 'sim-payout-%')
  await admin.from('transactions').delete().like('reference', 'rake-%')
  await admin.from('markets').delete().like('title', `${MARKET_PREFIX}%`)
  console.log(G(`Removed ${ids.length} sim markets and all associated data.`))
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--cleanup')) { await cleanup(); return }

  console.log(W('\n════════════════════════════════════════════'))
  console.log(W('  Sabula 256 — 1000-User Stress Simulation'))
  console.log(W('════════════════════════════════════════════'))
  console.log(`  ${NUM_MARKETS} markets × 1000 users = 10,000 bets`)
  console.log(`  Bet tiers: 1k–10k UGX | Rake: ${RAKE_PCT * 100}% | Asymmetric pool splits`)
  console.log(`  Time: ${new Date().toLocaleString('en-UG')}\n`)

  const users = await getUsers()
  console.log(`  ${users.length} test users found`)

  const initialTotal  = await fundUsers(users)
  const marketIds     = await createMarkets()
  const betsData      = await placeBets(users, marketIds)
  const settlements   = await settleMarkets(marketIds)
  const summary       = await verify(users, settlements, initialTotal, betsData)
  await adminSummary(users)

  const passed = checks.filter(c => c.ok).length
  const failed = checks.filter(c => !c.ok).length

  console.log(W('\n════════════════════════════════════════════'))
  console.log(W('  Results'))
  console.log(W('════════════════════════════════════════════'))
  checks.forEach(c => {
    console.log(`  ${c.ok ? G('PASS') : R('FAIL')}  ${c.name}`)
    if (!c.ok && c.detail) console.log(Y(`        → ${c.detail}`))
  })

  console.log(W(`\n  ${passed} passed · ${failed} failed / ${checks.length} total`))
  console.log(`  Total rake collected: UGX ${Math.round(summary.totalRakeActual).toLocaleString()}`)
  console.log(`  Rake in DB (transactions): UGX ${Math.round(summary.rakeTxnTotal).toLocaleString()}`)
  console.log(`  Final user funds: UGX ${Math.round(summary.finalTotal).toLocaleString()}\n`)

  if (failed === 0) {
    console.log(G('  All checks passed. Payout, rake accumulation, and conservation law verified.\n'))
  } else {
    console.log(R(`  ${failed} issue(s) detected — check above.\n`))
  }
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(R(e.stack)); process.exit(1) })
