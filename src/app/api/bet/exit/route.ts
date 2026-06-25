import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const EXIT_RATE = 0.85  // user receives 85% of their stake; house keeps 15% as liquidity fee

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { betId } = await req.json()
  if (!betId) return NextResponse.json({ error: 'Missing betId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: bet } = await admin
    .from('bets')
    .select('id, user_id, market_id, amount, status, markets(status, closes_at)')
    .eq('id', betId)
    .eq('user_id', user.id)
    .single()

  if (!bet) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
  if (bet.status !== 'active') return NextResponse.json({ error: 'Bet is not active' }, { status: 400 })

  const market = (Array.isArray(bet.markets) ? bet.markets[0] : bet.markets) as { status: string; closes_at: string | null } | null
  if (!market || market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open — early exit unavailable' }, { status: 400 })
  }
  if (market.closes_at && new Date(market.closes_at) <= new Date()) {
    return NextResponse.json({ error: 'Market has already closed' }, { status: 400 })
  }

  const stake   = Number(bet.amount)
  const cashout = Math.round(stake * EXIT_RATE)

  // Atomic claim — prevents double-exit under concurrent requests
  const { data: claimed, error: claimErr } = await admin
    .from('bets')
    .update({ status: 'exited', settled_payout: cashout })
    .eq('id', betId)
    .eq('status', 'active')
    .select('id')

  if (claimErr || !claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Bet already exited or settled' }, { status: 409 })
  }

  const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
    p_user_id: user.id,
    p_delta:   cashout,
  })

  await admin.from('transactions').insert({
    user_id:       user.id,
    type:          'cashout',
    amount:        cashout,
    balance_after: newBalance ?? null,
    status:        'completed',
    metadata:      { betId, stake, exit_rate: EXIT_RATE, market_id: bet.market_id },
  })

  return NextResponse.json({ ok: true, cashout })
}
