import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveVerification } from '@/lib/auto-verify'
import { settleMarket } from '@/lib/settle-market'

export async function POST() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Only fetch open markets with auto-verification that have passed their close time
  const { data: markets } = await admin
    .from('markets')
    .select('id, title, verification_type, verification_config, closes_at')
    .eq('status', 'open')
    .not('verification_type', 'is', null)
    .neq('verification_type', 'manual')
    .lte('closes_at', new Date().toISOString())

  if (!markets || markets.length === 0) {
    return NextResponse.json({ settled: 0, pending: 0, results: [] })
  }

  const results: Array<{ id: string; title: string; status: string; winner?: string; error?: string }> = []
  let settled = 0
  let pending = 0

  for (const market of markets) {
    const winner = await resolveVerification(
      market.verification_type,
      market.verification_config ?? {},
    )

    if (!winner) {
      pending++
      results.push({ id: market.id, title: market.title, status: 'pending' })
      continue
    }

    const { success, error } = await settleMarket(admin, market.id, winner)
    if (success) {
      settled++
      results.push({ id: market.id, title: market.title, status: 'settled', winner })
    } else {
      pending++
      results.push({ id: market.id, title: market.title, status: 'error', error })
    }
  }

  return NextResponse.json({ settled, pending, results })
}
