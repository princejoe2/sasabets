import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/market-token'

// Error codes returned by the place_bet stored procedure → HTTP status map
const RPC_STATUS: Record<string, number> = {
  profile_not_found:   404,
  market_not_found:    404,
  invalid_option:      400,
  suspended:           403,
  self_excluded:       403,
  private_market:      403,
  market_suspended:    400,
  market_not_open:     400,
  betting_closed:      400,
  account_too_new:     400,
  position_limit:      400,
  bet_too_large:       400,
  insufficient_balance:400,
  too_many_bets:       429,
  global_rate_limit:   429,
  duplicate_request:   409,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { marketId, optionId, amount, accessToken } = body

  if (!marketId || !optionId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (amount < 1000) {
    return NextResponse.json({ error: 'Minimum bet is UGX 1,000' }, { status: 400 })
  }

  // Private market token check: HMAC-based, must stay in app layer
  const { data: market } = await admin
    .from('markets')
    .select('metadata')
    .eq('id', marketId)
    .single()

  const meta = (market?.metadata ?? {}) as Record<string, unknown>
  if (meta.private === true) {
    if (!verifyAccessToken(meta, typeof accessToken === 'string' ? accessToken : null)) {
      return NextResponse.json({ code: 'private_market', message: 'You need the secret link to bet on this market' }, { status: 403 })
    }
  }

  // Single DB round-trip: all guards + wallet debit + market update + bet insert + transaction
  const { data: result, error: rpcErr } = await admin.rpc('place_bet', {
    p_user_id:   user.id,
    p_market_id: marketId,
    p_option_id: optionId,
    p_amount:    amount,
  })

  if (rpcErr) {
    console.error('place_bet RPC error:', rpcErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const res = result as Record<string, unknown>

  if (res.error) {
    const code = res.error as string
    const status = RPC_STATUS[code] ?? 400
    const { error: _e, ...rest } = res
    return NextResponse.json({ code, ...rest }, { status })
  }

  // Async side-effects (non-critical — don't block response)
  Promise.all([
    admin.from('audit_log').insert({
      entity_type: 'bet', action: 'placed',
      actor_id: user.id, actor_type: 'user',
      payload: { marketId, optionId, amount, newBalance: res.new_balance },
    }),
  ]).catch(() => {})

  const updatedOpts = (res.updated_options as Array<{ id: string; label: string; total_pool: number }>)
  const newTotal    = Number(res.new_total)
  const optionsWithProb = updatedOpts.map(o => ({
    id:          o.id,
    label:       o.label,
    pool:        o.total_pool,
    probability: newTotal > 0 ? Number(o.total_pool) / newTotal : 1 / updatedOpts.length,
  }))

  return NextResponse.json({
    success:    true,
    newBalance: res.new_balance,
    market: {
      total_pool: newTotal,
      options:    optionsWithProb,
    },
  })
}
