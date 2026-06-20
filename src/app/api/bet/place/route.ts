import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { marketId, optionId, amount } = await req.json()
  if (!marketId || !optionId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Fetch market
  const { data: market } = await admin
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single()

  if (!market || market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open' }, { status: 400 })
  }

  const opts = market.options as Array<{ id: string; label: string; total_pool: number }>
  const option = opts.find((o: { id: string }) => o.id === optionId)
  if (!option) return NextResponse.json({ error: 'Invalid option' }, { status: 400 })

  // Check wallet
  const { data: wallet } = await admin
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet || wallet.balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Deduct from wallet
  const newBalance = parseFloat(wallet.balance) - amount
  const { error: walletErr } = await admin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (walletErr) return NextResponse.json({ error: 'Wallet update failed' }, { status: 500 })

  // Update market pool
  const updatedOpts = opts.map((o: { id: string; label: string; total_pool: number }) =>
    o.id === optionId
      ? { ...o, total_pool: parseFloat(String(o.total_pool)) + amount }
      : o
  )
  const newTotal = parseFloat(String(market.total_pool)) + amount

  await admin
    .from('markets')
    .update({ options: updatedOpts, total_pool: newTotal })
    .eq('id', marketId)

  // Calculate estimated payout
  const potentialPayout =
    ((newTotal * (1 - market.rake_pct)) / (parseFloat(String(option.total_pool)) + amount)) * amount

  // Record bet
  const { error: betErr } = await admin.from('bets').insert({
    user_id: user.id,
    market_id: marketId,
    option_id: optionId,
    amount,
    potential_payout: potentialPayout,
    status: 'active',
    placed_at: new Date().toISOString(),
  })
  if (betErr) return NextResponse.json({ error: 'Bet insert failed' }, { status: 500 })

  // Record transaction
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
