import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const marketId = req.nextUrl.searchParams.get('market_id')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50'), 200)

  let query = admin
    .from('market_events')
    .select('id, market_id, event_type, event_data, actor_type, actor_id, created_at, markets(title)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (marketId) query = query.eq('market_id', marketId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data ?? [] })
}
