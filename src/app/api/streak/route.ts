import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false })

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('streak_days, last_active_date')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return NextResponse.json({ ok: false })

    const last = profile.last_active_date as string | null
    const streak = (profile.streak_days as number) ?? 0

    if (last === today) {
      // Already checked in today — return current streak, no update needed
      return NextResponse.json({ streak, bonus: 0, alreadyCheckedIn: true })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)

    let newStreak: number
    if (last === yStr) {
      // Consecutive day — increment
      newStreak = streak + 1
    } else {
      // Streak broken or first login
      newStreak = 1
    }

    // Award bonus at milestones
    const milestones: Record<number, number> = { 7: 1000, 14: 2000, 30: 5000 }
    let bonus = 0
    if (milestones[newStreak]) {
      bonus = milestones[newStreak]
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: Number(wallet.balance) + bonus })
          .eq('user_id', user.id)
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'streak_bonus',
          amount: bonus,
          status: 'completed',
          metadata: { streak_days: newStreak },
        })
      }
    }

    await supabase
      .from('profiles')
      .update({ streak_days: newStreak, last_active_date: today })
      .eq('id', user.id)

    return NextResponse.json({ streak: newStreak, bonus, alreadyCheckedIn: false })
  } catch {
    // Graceful degradation — columns may not exist yet
    return NextResponse.json({ ok: false })
  }
}
