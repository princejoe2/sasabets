import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const fallbackCount = { count: 0, data: null, error: null }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ achievements: [], stats: null }, { status: 401 })

  const admin = createAdminClient()

  const [betsRes, commentsRes, proposalsRes, referralsRes] = await Promise.all([
    admin.from('bets').select('id, amount, status, settled_payout').eq('user_id', user.id),
    Promise.resolve(admin.from('market_comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id)).catch(() => fallbackCount),
    Promise.resolve(admin.from('proposals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)).catch(() => fallbackCount),
    Promise.resolve(admin.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'referral_bonus')).catch(() => fallbackCount),
  ])

  const bets = betsRes.data ?? []
  const wonBets = bets.filter((b: { status: string }) => b.status === 'won')
  const totalWon = wonBets.reduce((s: number, b: { settled_payout: unknown }) => s + Number(b.settled_payout ?? 0), 0)
  const maxBet = bets.reduce((m: number, b: { amount: unknown }) => Math.max(m, Number(b.amount)), 0)

  let maxStreak = 0, streak = 0
  for (const b of bets as { status: string }[]) {
    if (b.status === 'won') { streak++; maxStreak = Math.max(maxStreak, streak) }
    else if (b.status === 'lost') streak = 0
  }

  const stats = {
    totalBets: bets.length,
    totalWins: wonBets.length,
    totalWon,
    maxBet,
    maxStreak,
    totalComments: commentsRes.count ?? 0,
    totalProposals: proposalsRes.count ?? 0,
    totalReferrals: referralsRes.count ?? 0,
  }

  const achievements = [
    { id: 'first_bet',   icon: '🎯', label: 'First Bet',       desc: 'Placed your first prediction',    earned: stats.totalBets >= 1 },
    { id: 'first_win',   icon: '🏆', label: 'First Win',       desc: 'Won your first prediction',       earned: stats.totalWins >= 1 },
    { id: 'on_a_roll',   icon: '🔥', label: 'On a Roll',       desc: 'Won 3 predictions in a row',      earned: stats.maxStreak >= 3 },
    { id: 'big_earner',  icon: '💰', label: 'Big Earner',      desc: 'Won over UGX 10,000',             earned: stats.totalWon >= 10000 },
    { id: 'high_roller', icon: '💎', label: 'High Roller',     desc: 'Placed a bet of UGX 50,000+',     earned: stats.maxBet >= 50000 },
    { id: 'veteran',     icon: '⭐', label: 'Veteran',         desc: 'Made 25+ predictions',            earned: stats.totalBets >= 25 },
    { id: 'community',   icon: '💬', label: 'Community Voice', desc: 'Left 5+ market comments',         earned: stats.totalComments >= 5 },
    { id: 'proposer',    icon: '💡', label: 'Market Maker',    desc: 'Submitted a market proposal',     earned: stats.totalProposals >= 1 },
    { id: 'referrer',    icon: '👥', label: 'Recruiter',       desc: 'Referred at least 1 friend',      earned: stats.totalReferrals >= 1 },
    { id: 'centurion',   icon: '💯', label: 'Centurion',       desc: 'Made 100+ predictions',           earned: stats.totalBets >= 100 },
  ]

  return NextResponse.json({ achievements, stats })
}
