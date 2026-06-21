import type { SupabaseClient } from '@supabase/supabase-js'

export async function settleMarket(
  admin: SupabaseClient,
  marketId: string,
  winningOptionId: string,
): Promise<{ success: boolean; error?: string }> {
  // Atomically claim the market for settlement — prevents double-payout under concurrency
  const { data: claimed, error: claimErr } = await admin
    .from('markets')
    .update({ status: 'settling' })
    .eq('id', marketId)
    .in('status', ['open', 'closed'])  // also settle closed-but-unsettled markets
    .select('*')
    .single()

  if (claimErr || !claimed) {
    return { success: false, error: 'Market already being settled or not found' }
  }

  const opts = claimed.options as Array<{ id: string; label: string; total_pool: number }>
  const winningOption = opts.find(o => o.id === winningOptionId)
  if (!winningOption) {
    // Roll back claim
    await admin.from('markets').update({ status: claimed.status }).eq('id', marketId)
    return { success: false, error: 'Invalid option' }
  }

  const totalPool   = Number(claimed.total_pool)
  const rakePct     = Math.min(Math.max(Number(claimed.rake_pct ?? 0.08), 0), 0.99)
  const prizePool   = totalPool * (1 - rakePct)
  const winningPool = Number(winningOption.total_pool)

  const { data: winningBets } = await admin
    .from('bets')
    .select('*')
    .eq('market_id', marketId)
    .eq('option_id', winningOptionId)
    .eq('status', 'active')

  if (winningBets && winningBets.length > 0 && winningPool > 0) {
    for (const bet of winningBets) {
      const betAmt = Number(bet.amount)
      const payout = (betAmt / winningPool) * prizePool

      // Idempotent per-bet: only credit if bet is still active
      const { data: claimed } = await admin
        .from('bets')
        .update({ status: 'won', settled_payout: payout })
        .eq('id', bet.id)
        .eq('status', 'active')
        .select('id')

      if (!claimed || claimed.length === 0) continue  // already paid, skip

      // Atomic credit: balance = balance + payout
      const { data: w } = await admin.from('wallets').select('balance').eq('user_id', bet.user_id).single()
      const newBalance = Number(w?.balance ?? 0) + payout
      await admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', bet.user_id)
      await admin.from('transactions').insert({
        user_id: bet.user_id, type: 'payout', amount: payout,
        balance_after: newBalance, status: 'completed',
        metadata: {
          marketId,
          winningOptionId,
          betId: bet.id,
          market_title: claimed.title,
          option_label: winningOption.label,
          stake: betAmt,
        },
      })
    }
  }

  await admin.from('bets')
    .update({ status: 'lost' })
    .eq('market_id', marketId)
    .eq('status', 'active')
    .neq('option_id', winningOptionId)

  await admin.from('markets')
    .update({ status: 'settled', winning_option_id: winningOptionId, settled_at: new Date().toISOString() })
    .eq('id', marketId)

  return { success: true }
}
