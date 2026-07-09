import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  const g = await guardAdmin(['moderator', 'support'])
  if ('error' in g) return g.error
  const { admin } = g

  const unresolvedOnly = req.nextUrl.searchParams.get('unresolved') !== 'false'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 500)

  let query = admin
    .from('account_flags')
    .select('id, user_id, flag_type, market_id, details, flagged_at, flagged_by, resolved_at, profiles!account_flags_user_id_fkey(full_name, phone), markets(title)')
    .order('flagged_at', { ascending: false })
    .limit(limit)

  if (unresolvedOnly) query = query.is('resolved_at', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ flags: data ?? [] })
}
