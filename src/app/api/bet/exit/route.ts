import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const EXIT_FEE_RATE = 0.25   // 25% fee; user receives 75%
const PLATFORM_SPLIT = 0.50  // 50% of fee to platform, 50% stays in pool

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { betId } = await req.json()
  if (!betId) return NextResponse.json({ error: 'Missing betId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('suspended, self_excluded_until')
    .eq('id', user.id)
    .single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'Self-exclusion is active.' }, { status: 403 })
  }

  const { data: bet } = await admin
    .from('bets')
    .select('id, user_id, market_id, option_id, amount, status, exited_at, markets(id, status, closes_at, options, total_pool)')
    .eq('id', betId)
    .eq('user_id', user.id)
    .single()

  if (!bet) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
  if (bet.status !== 'active') return NextResponse.json({ error: 'Bet is not active' }, { status: 400 })
  if (bet.exited_at) return NextResponse.json({ error: 'Bet already exited' }, { status: 409 })

  const market = (Array.isArray(bet.markets) ? bet.markets[0] : bet.markets) as {
    id: string; status: string; closes_at: string | null
    options: Array<{ id: string; label: string; total_pool: number }>
    total_pool: number
  } | null

  if (!market || market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open — early exit unavailable' }, { status: 400 })
  }
  if (market.closes_at && new Date(market.closes_at) <= new Date()) {
    return NextResponse.json({ error: 'Market has already closed — early exit unavailable' }, { status: 400 })
  }

  const stake        = Number(bet.amount)
  const exitFee      = Math.round(stake * EXIT_FEE_RATE)
  const refund       = stake - exitFee
  const platformKeep = Math.round(exitFee * PLATFORM_SPLIT)
  const poolKeep     = exitFee - platformKeep  // stays in pool to benefit remaining bettors

  // Atomic claim — prevents double-exit
  const { data: claimed, error: claimErr } = await admin
    .from('bets')
    .update({
      status: 'exited',
      settled_payout: refund,
      exited_at: new Date().toISOString(),
      exit_fee_paid: exitFee,
    })
    .eq('id', betId)
    .eq('status', 'active')
    .select('id')

  if (claimErr || !claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Bet already exited or settled' }, { status: 409 })
  }

  // Remove stake from the option's pool, but leave pool_keep in
  const opts = market.options as Array<{ id: string; label: string; total_pool: number }>
  const updatedOpts = opts.map(o =>
    o.id === bet.option_id
      ? { ...o, total_pool: Math.max(0, Number(o.total_pool) - stake + poolKeep) }
      : o
  )
  const newMarketTotal = Math.max(0, Number(market.total_pool) - stake + poolKeep)

  await admin.from('markets').update({
    options: updatedOpts,
    total_pool: newMarketTotal,
  }).eq('id', market.id)

  // Credit refund to user's wallet
  const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
    p_user_id: user.id,
    p_delta: refund,
  })

  // Record transactions
  await Promise.all([
    admin.from('transactions').insert({
      user_id: user.id,
      type: 'cashout',
      amount: refund,
      balance_after: newBalance ?? null,
      status: 'completed',
      metadata: {
        betId,
        stake,
        exit_fee: exitFee,
        platform_keep: platformKeep,
        pool_keep: poolKeep,
        market_id: market.id,
      },
    }),
    // Record exit fee as platform revenue (same pattern as rake transactions)
    admin.from('transactions').insert({
      user_id: user.id,
      type: 'exit_fee',
      amount: platformKeep,
      status: 'completed',
      metadata: { betId, market_id: market.id, stake },
    }),
    admin.from('audit_log').insert({
      entity_type: 'exit', action: 'bet_exited',
      actor_id: user.id, actor_type: 'user',
      payload: { betId, stake, exitFee, refund, platformKeep, poolKeep, marketId: market.id },
    }),
  ])

  return NextResponse.json({
    ok: true,
    refund_amount: refund,
    exit_fee_paid: exitFee,
    platform_kept: platformKeep,
    pool_kept: poolKeep,
    wallet_new_balance: newBalance ?? null,
    cashout: refund,  // kept for backwards compat with existing bets page
    message: `You exited early. UGX ${refund.toLocaleString()} has been returned to your wallet (25% exit fee applied).`,
  })
}
