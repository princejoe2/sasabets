import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const LAUNCH_STAKE = 5_000

const CATEGORY_MAP: Record<string, string> = {
  football: 'football', politics: 'politics', economy: 'economy',
  entertainment: 'entertainment', tech: 'tech', infrastructure: 'infrastructure',
  agriculture: 'agriculture', other: 'default',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to create a market' }, { status: 401 })

  const { title, description, optionA, optionB, category, closesAt, betSide } = await req.json()

  if (!title?.trim() || !optionA?.trim() || !optionB?.trim()) {
    return NextResponse.json({ error: 'Title and both sides are required' }, { status: 400 })
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: 'Title is too long (max 200 characters)' }, { status: 400 })
  }
  if (!['a', 'b'].includes(betSide)) {
    return NextResponse.json({ error: 'Choose which side you are backing to launch' }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, suspended, self_excluded_until')
    .eq('id', user.id)
    .single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded from betting.' }, { status: 403 })
  }

  // Rate limit: max 5 user-created markets per day
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: todayCount } = await admin
    .from('markets')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', dayAgo)
  if ((todayCount ?? 0) >= 5) {
    return NextResponse.json({ error: 'You can create up to 5 markets per day' }, { status: 429 })
  }

  // Check wallet balance
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  if (!wallet || Number(wallet.balance) < LAUNCH_STAKE) {
    return NextResponse.json({
      error: `You need at least UGX ${LAUNCH_STAKE.toLocaleString()} in your wallet to launch a market`,
      balance: Number(wallet?.balance ?? 0),
    }, { status: 400 })
  }

  const cat = CATEGORY_MAP[category?.toLowerCase() ?? ''] ?? 'default'
  const options = [
    { id: 'a', label: optionA.trim(), total_pool: 0 },
    { id: 'b', label: optionB.trim(), total_pool: 0 },
  ]

  const { data: market, error: mktErr } = await admin.from('markets').insert({
    title:       title.trim(),
    description: description?.trim() || null,
    options,
    status:      'open',
    closes_at:   closesAt || null,
    rake_pct:    0.08,
    total_pool:  0,
    created_by:  user.id,
    metadata: {
      category:     cat,
      user_created: true,
      creator_name: profile?.full_name ?? 'Community',
    },
  }).select('id').single()

  if (mktErr || !market) {
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }

  // Place launch stake atomically
  const chosenIdx  = betSide === 'a' ? 0 : 1
  const chosenOpt  = options[chosenIdx]
  const updatedOpts = options.map((o, i) =>
    i === chosenIdx ? { ...o, total_pool: LAUNCH_STAKE } : o
  )

  const newBalance = Number(wallet.balance) - LAUNCH_STAKE
  const { data: deducted } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .gte('balance', LAUNCH_STAKE)
    .select('id')

  if (!deducted || deducted.length === 0) {
    await admin.from('markets').delete().eq('id', market.id)
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  await admin.from('markets').update({ options: updatedOpts, total_pool: LAUNCH_STAKE }).eq('id', market.id)

  await admin.from('bets').insert({
    user_id:          user.id,
    market_id:        market.id,
    option_id:        chosenOpt.id,
    amount:           LAUNCH_STAKE,
    potential_payout: LAUNCH_STAKE,
    status:           'active',
    placed_at:        new Date().toISOString(),
  })

  await admin.from('transactions').insert({
    user_id:       user.id,
    type:          'bet',
    amount:        -LAUNCH_STAKE,
    balance_after: newBalance,
    status:        'completed',
    metadata:      { marketId: market.id, optionId: chosenOpt.id, market_launch: true },
  })

  return NextResponse.json({ marketId: market.id, newBalance })
}
