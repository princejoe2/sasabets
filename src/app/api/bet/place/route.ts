import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

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
    .select('suspended, self_excluded_until')
    .eq('id', user.id)
    .single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded from betting.' }, { status: 403 })
  }

  // Rate limit: 20 bets per 5 minutes per user
  const betWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: recentBets } = await admin
    .from('bets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('placed_at', betWindow)
  if ((recentBets ?? 0) >= 20) {
    return NextResponse.json({ error: 'Too many bets placed. Please wait a few minutes.' }, { status: 429 })
  }

  // Fetch market
  const { data: market } = await admin.from('markets').select('*').eq('id', marketId).single()
  if (!market || market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open' }, { status: 400 })
  }

  const opts = market.options as Array<{ id: string; label: string; total_pool: number }>
  const option = opts.find(o => o.id === optionId)
  if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  // Atomic deduction: WHERE balance >= amount prevents overdraft even under concurrency
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  if (!wallet || Number(wallet.balance) < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }
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

  // Update market pool
  const updatedOpts = opts.map(o =>
    o.id === optionId ? { ...o, total_pool: Number(o.total_pool) + amount } : o
  )
  const newTotal = Number(market.total_pool) + amount
  await admin.from('markets').update({ options: updatedOpts, total_pool: newTotal }).eq('id', marketId)

  const potentialPayout =
    ((newTotal * (1 - Number(market.rake_pct))) / (Number(option.total_pool) + amount)) * amount

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
    // Refund wallet if bet record failed
    await admin.from('wallets').update({ balance: Number(wallet.balance), updated_at: new Date().toISOString() }).eq('user_id', user.id)
    return NextResponse.json({ error: 'Bet insert failed' }, { status: 500 })
  }

  await admin.from('transactions').insert({
    user_id: user.id,
    type: 'bet',
    amount: -amount,
    balance_after: newBalance,
    status: 'completed',
    metadata: { marketId, optionId },
  })

  return NextResponse.json({ success: true, newBalance })
}
