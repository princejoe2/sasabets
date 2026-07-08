import type { SupabaseClient } from '@supabase/supabase-js'

// Cancels a market and refunds every active bet (each bettor's stake returned to
// their wallet). Used by admin takedown of bad community markets and reusable for
// any "cancel + make everyone whole" flow. Idempotent per bet and atomic on the
// market claim, so concurrent/duplicate calls never double-refund.
export async function cancelAndRefundMarket(
  admin: SupabaseClient,
  marketId: string,
  opts: { reason: string; fromStatuses?: string[] },
): Promise<{ ok: boolean; refundedBets: number; refundedTotal: number; error?: string }> {
  const fromStatuses = opts.fromStatuses ?? ['pending_approval', 'open', 'closed', 'suspended']

  const { data: market } = await admin
    .from('markets')
    .select('id, title, status')
    .eq('id', marketId)
    .single()

  if (!market) return { ok: false, refundedBets: 0, refundedTotal: 0, error: 'Market not found' }
  if (market.status === 'settled') {
    return { ok: false, refundedBets: 0, refundedTotal: 0, error: 'Cannot remove a settled market' }
  }

  // Atomic claim: only one caller flips it to cancelled.
  const { data: claimed } = await admin
    .from('markets')
    .update({ status: 'cancelled' })
    .eq('id', marketId)
    .in('status', fromStatuses)
    .select('id')
    .single()

  if (!claimed) {
    return { ok: false, refundedBets: 0, refundedTotal: 0, error: 'Market already cancelled or settled' }
  }

  const { data: bets } = await admin
    .from('bets')
    .select('id, user_id, amount')
    .eq('market_id', marketId)
    .eq('status', 'active')

  let refundedBets = 0
  let refundedTotal = 0

  for (const bet of bets ?? []) {
    // Idempotent per bet — only refund if we win the claim to cancel it.
    const { data: claimedBet } = await admin
      .from('bets')
      .update({ status: 'cancelled' })
      .eq('id', bet.id)
      .eq('status', 'active')
      .select('id')

    if (!claimedBet || claimedBet.length === 0) continue

    const refund = Number(bet.amount)
    const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
      p_user_id: bet.user_id,
      p_delta: refund,
    })
    await admin.from('transactions').insert({
      user_id: bet.user_id,
      type: 'refund',
      amount: refund,
      balance_after: newBalance ?? undefined,
      status: 'completed',
      metadata: { marketId, market_title: market.title, reason: opts.reason },
    })
    refundedBets++
    refundedTotal += refund
  }

  return { ok: true, refundedBets, refundedTotal }
}
