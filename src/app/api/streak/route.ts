import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient()
    const admin    = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false })

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('streak_days, last_active_date')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return NextResponse.json({ ok: false })

    const last = profile.last_active_date as string | null
    const streak = (profile.streak_days as number) ?? 0

    if (last === today) {
      return NextResponse.json({ streak, bonus: 0, alreadyCheckedIn: true })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)

    const newStreak = last === yStr ? streak + 1 : 1

    // Atomic CAS: only update if last_active_date has not already been flipped to today
    // by a concurrent request. If count === 0 another request won the race.
    const { data: updated } = await admin
      .from('profiles')
      .update({ streak_days: newStreak, last_active_date: today })
      .eq('id', user.id)
      .or(`last_active_date.is.null,last_active_date.neq.${today}`)
      .select('id')

    if (!updated || updated.length === 0) {
      return NextResponse.json({ streak: newStreak, bonus: 0, alreadyCheckedIn: true })
    }

    // Award bonus at milestones — safe to credit now, gate was won above
    const milestones: Record<number, number> = { 7: 1000, 14: 2000, 30: 5000 }
    let bonus = 0
    if (milestones[newStreak]) {
      bonus = milestones[newStreak]
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: user.id,
        p_delta:   bonus,
      })
      await admin.from('transactions').insert({
        user_id:       user.id,
        type:          'streak_bonus',
        amount:        bonus,
        balance_after: newBalance ?? null,
        status:        'completed',
        metadata:      { streak_days: newStreak },
      })
    }

    return NextResponse.json({ streak: newStreak, bonus, alreadyCheckedIn: false })
  } catch {
    // Graceful degradation — columns may not exist yet
    return NextResponse.json({ ok: false })
  }
}
