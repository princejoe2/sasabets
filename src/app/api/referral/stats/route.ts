import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: profile }, { count: referredCount }, { data: bonuses }] = await Promise.all([
    admin.from('profiles').select('referral_code').eq('id', user.id).single(),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
    admin.from('referral_events').select('bonus_amount').eq('referrer_id', user.id),
  ])

  const bonusEarned = bonuses?.reduce((s, e) => s + Number(e.bonus_amount), 0) ?? 0

  return NextResponse.json({
    referralCode:  profile?.referral_code ?? null,
    referredCount: referredCount ?? 0,
    bonusEarned,
  })
}
