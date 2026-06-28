import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type Opt = { id: string; label: string; total_pool: number }

function guardError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ code, message, ...extra }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { marketId, optionId, amount } = await req.json()
  if (!marketId || !optionId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (amount < 1000) {
    return NextResponse.json({ error: 'Minimum bet is UGX 1,000' }, { status: 400 })
  }

  // Check suspended / self-excluded
  const { data: profile } = await admin
    .from('profiles')
    .select('suspended, self_excluded_until, created_at')
    .eq('id', user.id)
    .single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded from betting.' }, { status: 403 })
  }

  // Fetch market (single query used for all guards)
  const { data: market } = await admin
    .from('markets')
    .select('id, title, status, closes_at, options, total_pool, rake_pct, surge_flag')
    .eq('id', marketId)
    .single()

  // GUARD 1 — Market status
  if (!market) {
    return guardError(404, 'market_not_found', 'Market not found')
  }
  if (market.status === 'suspended') {
    return guardError(400, 'market_suspended', 'This market is temporarily suspended pending review')
  }
  if (market.status !== 'open') {
    return guardError(400, 'market_not_open', 'This market is not accepting bets', { status: market.status })
  }
  if (market.closes_at && new Date(market.closes_at) <= new Date()) {
    return guardError(400, 'betting_closed', 'Betting on this market has closed')
  }

  const opts = market.options as Opt[]
  const option = opts.find(o => o.id === optionId)
  if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  const totalPool = Number(market.total_pool)

  // GUARD 2 — Wallet balance
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  if (!wallet || Number(wallet.balance) < amount) {
    return guardError(400, 'insufficient_balance', 'Your wallet balance is too low', {
      balance: Number(wallet?.balance ?? 0),
      required: amount,
    })
  }

  // GUARD 3 — New account large bet
  const accountAge = profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) / 1000
    : Infinity
  if (accountAge < 72 * 3600 && amount > 50_000) {
    await admin.from('account_flags').insert({
      user_id: user.id,
      flag_type: 'new_account_large_bet',
      market_id: marketId,
      details: { amount, account_age_hours: Math.round(accountAge / 3600) },
    })
    await admin.from('audit_log').insert({
      entity_type: 'bet', action: 'rejected_new_account_large_bet',
      actor_id: user.id, actor_type: 'user',
      payload: { marketId, optionId, amount, code: 'account_too_new' },
    })
    return guardError(400, 'account_too_new',
      'New accounts are limited to UGX 50,000 per bet for 72 hours',
      { max_allowed: 50_000 })
  }

  // GUARD 4 — Pool concentration limit (only when pool > 500k)
  if (totalPool > 500_000) {
    const optPool = Number(option.total_pool)
    const { data: existing } = await admin
      .from('bets')
      .select('amount')
      .eq('user_id', user.id)
      .eq('market_id', marketId)
      .eq('option_id', optionId)
      .eq('status', 'active')

    const userExisting = (existing ?? []).reduce((s, b) => s + Number(b.amount), 0)
    const newTotalOnSide = userExisting + amount
    const sidePoolAfter = optPool + amount
    const userShare = newTotalOnSide / sidePoolAfter

    if (userShare > 0.20) {
      const maxAdditional = Math.max(0, Math.floor(sidePoolAfter * 0.20) - userExisting)
      await admin.from('audit_log').insert({
        entity_type: 'bet', action: 'rejected_position_limit',
        actor_id: user.id, actor_type: 'user',
        payload: { marketId, optionId, amount, userShare: Math.round(userShare * 100), code: 'position_limit' },
      })
      return guardError(400, 'position_limit',
        'You cannot hold more than 20% of one side of a market',
        { max_additional_allowed: maxAdditional })
    }
  }

  // GUARD 5 — Single bet size limit (only when pool > 500k)
  if (totalPool > 500_000) {
    const maxBet = Math.floor(totalPool * 0.15)
    if (amount > maxBet) {
      await admin.from('audit_log').insert({
        entity_type: 'bet', action: 'rejected_bet_too_large',
        actor_id: user.id, actor_type: 'user',
        payload: { marketId, optionId, amount, maxBet, code: 'bet_too_large' },
      })
      return guardError(400, 'bet_too_large',
        'Single bet cannot exceed 15% of the current pool',
        { max_allowed: maxBet })
    }
  }

  // GUARD 6 — Surge cap
  if (market.surge_flag) {
    const { data: surgeFlag } = await admin
      .from('account_flags')
      .select('id')
      .eq('user_id', user.id)
      .eq('market_id', marketId)
      .eq('flag_type', 'surge_bet')
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle()

    if (surgeFlag && amount > 50_000) {
      return guardError(400, 'surge_cap',
        'Your bets on this market are temporarily limited due to unusual activity',
        { max_allowed: 50_000 })
    }
  }

  // GUARD 7 — Velocity check (5 bets per hour per market)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentBets } = await admin
    .from('bets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('market_id', marketId)
    .gte('placed_at', hourAgo)

  if ((recentBets ?? 0) >= 5) {
    await admin.from('account_flags').insert({
      user_id: user.id,
      flag_type: 'velocity_exceeded',
      market_id: marketId,
      details: { bets_last_hour: recentBets },
    })
    await admin.from('audit_log').insert({
      entity_type: 'bet', action: 'rejected_velocity',
      actor_id: user.id, actor_type: 'user',
      payload: { marketId, bets_last_hour: recentBets, code: 'too_many_bets' },
    })
    return guardError(429, 'too_many_bets',
      'You have placed too many bets on this market recently. Please wait before placing another.',
      { retry_after_minutes: 15 })
  }

  // ── All guards passed — place the bet ──

  // Global rate limit: 20 bets per 5 min across all markets
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: globalRecent } = await admin
    .from('bets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('placed_at', fiveMinAgo)
  if ((globalRecent ?? 0) >= 20) {
    return NextResponse.json({ error: 'Too many bets placed. Please wait a few minutes.' }, { status: 429 })
  }

  // Atomic wallet deduction
  const newBalance = Number(wallet.balance) - amount
  const { data: updated } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .gte('balance', amount)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Update market pool (options JSONB + total_pool)
  const updatedOpts = opts.map(o =>
    o.id === optionId ? { ...o, total_pool: Number(o.total_pool) + amount } : o
  )
  const newTotal = totalPool + amount
  await admin.from('markets').update({ options: updatedOpts, total_pool: newTotal }).eq('id', marketId)

  const rake = Number(market.rake_pct ?? 0.08)
  const potentialPayout =
    ((newTotal * (1 - rake)) / (Number(option.total_pool) + amount)) * amount

  const { error: betErr } = await admin.from('bets').insert({
    user_id: user.id,
    market_id: marketId,
    option_id: optionId,
    amount,
    potential_payout: potentialPayout,
    status: 'active',
    placed_at: new Date().toISOString(),
  })

  if (betErr) {
    await admin.from('wallets').update({ balance: wallet.balance, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    return NextResponse.json({ error: 'Bet insert failed' }, { status: 500 })
  }

  await Promise.all([
    admin.from('transactions').insert({
      user_id: user.id,
      type: 'bet',
      amount: -amount,
      balance_after: newBalance,
      status: 'completed',
      metadata: { marketId, optionId },
    }),
    admin.from('audit_log').insert({
      entity_type: 'bet', action: 'placed',
      actor_id: user.id, actor_type: 'user',
      payload: { marketId, optionId, amount, newBalance },
    }),
  ])

  // Return updated odds so frontend doesn't need a second round-trip
  const updatedOptsForRes = updatedOpts
  const updatedTotalForRes = newTotal
  const optionsWithProb = updatedOptsForRes.map(o => ({
    id: o.id,
    label: o.label,
    pool: o.total_pool,
    probability: updatedTotalForRes > 0 ? Number(o.total_pool) / updatedTotalForRes : 1 / updatedOptsForRes.length,
  }))

  return NextResponse.json({
    success: true,
    newBalance,
    market: {
      total_pool: newTotal,
      options: optionsWithProb,
    },
  })
}
