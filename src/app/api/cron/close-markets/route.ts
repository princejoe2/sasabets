import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Vercel Cron: every 5 minutes — closes non-updown markets whose closes_at has passed
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const authHeader = req.headers.get('authorization')
  const urlSecret  = req.nextUrl.searchParams.get('secret')
  if (authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: expired, error } = await admin
    .from('markets')
    .select('id, metadata')
    .eq('status', 'open')
    .lt('closes_at', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Only close regular markets here — updown markets are handled by settle-updown cron
  const regular = (expired ?? []).filter(
    m => (m.metadata as Record<string, unknown> | null)?.type !== 'updown'
  )

  if (regular.length === 0) return NextResponse.json({ closed: 0 })

  // Fetch full market data to record closing probability
  const { data: fullMarkets } = await admin
    .from('markets')
    .select('id, options, total_pool')
    .in('id', regular.map(m => m.id))

  for (const m of fullMarkets ?? []) {
    const opts = (m.options as Array<{ id: string; total_pool: number }>) ?? []
    const total = Number(m.total_pool)
    const prob = opts.length >= 1 && total > 0
      ? Math.round((Number(opts[0].total_pool) / total) * 10000) / 10000
      : 0.5

    const { data: betCount } = await admin
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('market_id', m.id)
      .neq('status', 'exited')

    await admin.from('markets')
      .update({ status: 'closed', probability_at_close: prob })
      .eq('id', m.id)
      .eq('status', 'open')

    await admin.from('market_events').insert({
      market_id: m.id,
      event_type: 'market_closed',
      event_data: {
        final_prob_option_a: prob,
        final_pool: total,
        final_bettor_count: betCount ?? 0,
      },
    })
  }

  const ids = regular.map(m => m.id)
  return NextResponse.json({ closed: ids.length, ids })
}
