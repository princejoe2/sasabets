import { SupabaseClient } from '@supabase/supabase-js'

export interface AmlFlag {
  user_id: string
  phone: string | null
  full_name: string | null
  flag_type: 'large_deposit' | 'rapid_deposits' | 'deposit_withdrawal_no_bet' | 'smurfing'
  amount: number
  transaction_ids: string[]
  created_at: string
  flagged_at: string
}

/**
 * Detect AML flags in user transaction patterns
 */
export async function detectAmlFlags(admin: SupabaseClient) {
  const flags: AmlFlag[] = []

  // Fetch all transactions and profiles
  const [{ data: transactions }, { data: profiles }] = await Promise.all([
    admin
      .from('transactions')
      .select('id, user_id, type, amount, created_at, status')
      .eq('status', 'completed')
      .in('type', ['deposit', 'withdrawal', 'bet']),
    admin.from('profiles').select('id, phone, full_name'),
  ])

  if (!transactions || !profiles) {
    return flags
  }

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  // Group transactions by user
  const txnsByUser = transactions.reduce<
    Record<string, Array<{ id: string; type: string; amount: number; created_at: string }>>
  >((acc, t) => {
    if (!acc[t.user_id]) acc[t.user_id] = []
    acc[t.user_id].push({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      created_at: t.created_at,
    })
    return acc
  }, {})

  // Check each user
  for (const [userId, userTxns] of Object.entries(txnsByUser)) {
    const profile = profileMap[userId]
    const deposits = userTxns.filter(t => t.type === 'deposit')
    const withdrawals = userTxns.filter(t => t.type === 'withdrawal')
    const bets = userTxns.filter(t => t.type === 'bet')

    // 1. Large single deposit (≥ UGX 5,000,000)
    for (const dep of deposits) {
      if (dep.amount >= 5_000_000) {
        flags.push({
          user_id: userId,
          phone: profile?.phone ?? null,
          full_name: profile?.full_name ?? null,
          flag_type: 'large_deposit',
          amount: dep.amount,
          transaction_ids: [dep.id],
          created_at: dep.created_at,
          flagged_at: new Date().toISOString(),
        })
      }
    }

    // 2. Rapid deposits (> UGX 3,000,000 within 24 hours)
    for (let i = 0; i < deposits.length; i++) {
      const window24h = deposits.filter(d => {
        const diff = new Date(d.created_at).getTime() - new Date(deposits[i].created_at).getTime()
        return Math.abs(diff) <= 24 * 60 * 60 * 1000
      })
      const totalInWindow = window24h.reduce((s, d) => s + d.amount, 0)

      if (totalInWindow > 3_000_000 && window24h.length > 1) {
        // Avoid duplicate flags for same user
        if (!flags.some(f => f.user_id === userId && f.flag_type === 'rapid_deposits')) {
          flags.push({
            user_id: userId,
            phone: profile?.phone ?? null,
            full_name: profile?.full_name ?? null,
            flag_type: 'rapid_deposits',
            amount: totalInWindow,
            transaction_ids: window24h.map(d => d.id),
            created_at: window24h[0].created_at,
            flagged_at: new Date().toISOString(),
          })
        }
        break
      }
    }

    // 3. Deposit-withdrawal with no bet (≥ UGX 500,000 within 2 hours)
    for (const dep of deposits) {
      const within2h = withdrawals.filter(w => {
        const diff = new Date(w.created_at).getTime() - new Date(dep.created_at).getTime()
        return diff >= 0 && diff <= 2 * 60 * 60 * 1000
      })

      for (const wd of within2h) {
        if (Math.abs(wd.amount) >= 500_000) {
          // Check if there are any bets between dep and wd
          const betsBetween = bets.filter(b => {
            const bTime = new Date(b.created_at).getTime()
            const dTime = new Date(dep.created_at).getTime()
            const wTime = new Date(wd.created_at).getTime()
            return bTime >= dTime && bTime <= wTime
          })

          if (betsBetween.length === 0) {
            if (!flags.some(f => f.user_id === userId && f.flag_type === 'deposit_withdrawal_no_bet')) {
              flags.push({
                user_id: userId,
                phone: profile?.phone ?? null,
                full_name: profile?.full_name ?? null,
                flag_type: 'deposit_withdrawal_no_bet',
                amount: Math.abs(wd.amount),
                transaction_ids: [dep.id, wd.id],
                created_at: dep.created_at,
                flagged_at: new Date().toISOString(),
              })
            }
            break
          }
        }
      }
      if (flags.some(f => f.user_id === userId && f.flag_type === 'deposit_withdrawal_no_bet')) {
        break
      }
    }

    // 4. Smurfing (5+ deposits all between UGX 490k–500k within 24 hours)
    for (let i = 0; i < deposits.length; i++) {
      const window24h = deposits.filter(d => {
        const diff = new Date(d.created_at).getTime() - new Date(deposits[i].created_at).getTime()
        return Math.abs(diff) <= 24 * 60 * 60 * 1000
      })

      const smurfDeposits = window24h.filter(d => d.amount >= 490_000 && d.amount <= 500_000)
      if (smurfDeposits.length >= 5) {
        if (!flags.some(f => f.user_id === userId && f.flag_type === 'smurfing')) {
          flags.push({
            user_id: userId,
            phone: profile?.phone ?? null,
            full_name: profile?.full_name ?? null,
            flag_type: 'smurfing',
            amount: smurfDeposits.reduce((s, d) => s + d.amount, 0),
            transaction_ids: smurfDeposits.map(d => d.id),
            created_at: smurfDeposits[0].created_at,
            flagged_at: new Date().toISOString(),
          })
        }
        break
      }
    }
  }

  return flags
}
