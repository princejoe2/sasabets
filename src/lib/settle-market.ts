import type { SupabaseClient } from '@supabase/supabase-js'
import { sendSms } from '@/lib/sms'

export async function settleMarket(
  admin: SupabaseClient,
  marketId: string,
  winningOptionId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: market } = await admin.from('markets').select('*').eq('id', marketId).single()
  if (!market || market.status !== 'open') {
    return { success: false, error: 'Market not found or not open' }
  }

  const opts = market.options as Array<{ id: string; label: string; total_pool: number }>
  const winningOption = opts.find(o => o.id === winningOptionId)
  if (!winningOption) return { success: false, error: 'Invalid option' }

  const totalPool   = parseFloat(market.total_pool)
  const prizePool   = totalPool * (1 - market.rake_pct)
  const winningPool = parseFloat(String(winningOption.total_pool))

  const { data: winningBets } = await admin
    .from('bets')
    .select('*')
    .eq('market_id', marketId)
    .eq('option_id', winningOptionId)
    .eq('status', 'active')

  if (winningBets && winningBets.length > 0 && winningPool > 0) {
    for (const bet of winningBets) {
      const betAmt    = parseFloat(bet.amount)
      const payout    = (betAmt / winningPool) * prizePool
      const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', bet.user_id).single()
      const newBalance = parseFloat(wallet?.balance ?? 0) + payout

      await admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', bet.user_id)
      await admin.from('bets').update({ status: 'won', settled_payout: payout }).eq('id', bet.id)
      await admin.from('transactions').insert({
        user_id: bet.user_id, type: 'payout', amount: payout,
        balance_after: newBalance, status: 'completed',
        metadata: { marketId, winningOptionId, betId: bet.id },
      })
    }
  }

  await admin.from('bets').update({ status: 'lost' }).eq('market_id', marketId).eq('status', 'active').neq('option_id', winningOptionId)
  await admin.from('markets').update({ status: 'settled', winning_option_id: winningOptionId, settled_at: new Date().toISOString() }).eq('id', marketId)

  // SMS notifications to winners
  if (winningBets && winningBets.length > 0 && winningPool > 0) {
    const winnerIds = winningBets.map(b => b.user_id)
    const { data: winnerProfiles } = await admin.from('profiles').select('id, phone').in('id', winnerIds)
    const phoneMap = Object.fromEntries((winnerProfiles ?? []).map(p => [p.id, p.phone]))
    for (const bet of winningBets) {
      const phone = phoneMap[bet.user_id]
      if (!phone) continue
      const payout   = (parseFloat(bet.amount) / winningPool) * prizePool
      const winLabel = winningOption.label
      await sendSms(phone,
        `Sabula 256: Congrats! Your prediction on "${market.title}" was correct (${winLabel}). ` +
        `UGX ${Math.floor(payout).toLocaleString()} has been credited to your wallet.`
      )
    }
  }

  return { success: true }
}
