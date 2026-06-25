import type { SupabaseClient } from '@supabase/supabase-js'

export async function settleMarket(
  admin: SupabaseClient,
  marketId: string,
  winningOptionId: string,
): Promise<{ success: boolean; error?: string }> {
  // Atomically claim the market for settlement — prevents double-payout under concurrency
  const { data: claimedRaw, error: claimErr } = await admin
    .from('markets')
    .update({ status: 'settling' })
    .eq('id', marketId)
    .in('status', ['open', 'closed'])  // also settle closed-but-unsettled markets
    .select('*')
    .single()

  if (claimErr || !claimedRaw) {
    return { success: false, error: 'Market already being settled or not found' }
  }

  const claimed = claimedRaw as {
    id: string; title: string; status: string; options: unknown
    total_pool: number; rake_pct: number; winning_option_id: string | null
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
      const { data: claimedBet } = await admin
        .from('bets')
        .update({ status: 'won', settled_payout: payout })
        .eq('id', bet.id)
        .eq('status', 'active')
        .select('id')

      if (!claimedBet || claimedBet.length === 0) continue  // already paid, skip

      // Atomic wallet credit via RPC — eliminates read-modify-write race
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: bet.user_id,
        p_delta: payout,
      })
      await admin.from('transactions').insert({
        user_id: bet.user_id, type: 'payout', amount: payout,
        balance_after: newBalance ?? undefined, status: 'completed',
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

  // Record rake as a platform transaction so admin funds page shows exact accumulated rake
  const rake = totalPool * rakePct
  if (rake > 0) {
    const { data: adminProfiles } = await admin
      .from('profiles').select('id').eq('is_admin', true).limit(1)
    const adminProfile = adminProfiles?.[0]
    if (!adminProfile) {
      console.error(`[settle-market] No admin profile found — rake UGX ${rake} not recorded for market ${marketId}`)
    } else {
      const { error: rakeErr } = await admin.from('transactions').insert({
        user_id:   adminProfile.id,
        type:      'rake',
        amount:    rake,
        status:    'completed',
        reference: `rake-${marketId}`,
        metadata:  { marketId, market_title: claimed.title, totalPool, rakePct, winningOptionId },
      })
      // 23505 = unique_violation: rake already recorded (settlement retried), safe to ignore
      if (rakeErr && (rakeErr as { code?: string }).code !== '23505') {
        console.error(`[settle-market] Rake insert failed for market ${marketId}:`, rakeErr.message)
      }
    }
  }

  await admin.from('markets')
    .update({ status: 'settled', winning_option_id: winningOptionId, settled_at: new Date().toISOString() })
    .eq('id', marketId)

  return { success: true }
}
