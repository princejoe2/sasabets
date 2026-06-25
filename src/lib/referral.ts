import type { SupabaseClient } from '@supabase/supabase-js'

const REFERRAL_BONUS = 2000

export async function maybeFireReferralBonus(
  admin: SupabaseClient,
  userId: string,
  currentTxnId: string,
) {
  const { count: prior } = await admin.from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'deposit')
    .eq('status', 'completed')
    .neq('id', currentTxnId)

  if ((prior ?? 0) !== 0) return

  const { data: profile } = await admin.from('profiles')
    .select('referred_by').eq('id', userId).single()

  if (!profile?.referred_by) return

  const { error: refErr } = await admin.from('referral_events').insert({
    referrer_id:  profile.referred_by,
    referred_id:  userId,
    bonus_amount: REFERRAL_BONUS,
  })
  if (refErr) return  // unique_violation = already paid (concurrent or retry), safe to skip

  const { data: refBalance } = await admin.rpc('adjust_wallet_balance', {
    p_user_id: profile.referred_by,
    p_delta:   REFERRAL_BONUS,
  })

  // Track the bonus as locked (unwithdrawable) by incrementing bonus_balance
  const { data: walletNow } = await admin.from('wallets')
    .select('bonus_balance').eq('user_id', profile.referred_by).single()
  await admin.from('wallets')
    .update({ bonus_balance: (Number(walletNow?.bonus_balance ?? 0)) + REFERRAL_BONUS })
    .eq('user_id', profile.referred_by)

  await admin.from('transactions').insert({
    user_id:       profile.referred_by,
    type:          'referral_bonus',
    amount:        REFERRAL_BONUS,
    balance_after: refBalance ?? null,
    status:        'completed',
    metadata:      { referred_user_id: userId },
  })
}
