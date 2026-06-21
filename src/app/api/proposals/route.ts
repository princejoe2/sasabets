import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proposals')
    .select('id, title, description, category, option_a, option_b, status, market_id, vote_count, created_at')
    .order('vote_count', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[proposals] fetch failed:', error.message)
    return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, category, option_a, option_b, closes_suggestion } = await req.json()
  if (!title || !option_a || !option_b) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (String(title).length > 200 || String(option_a).length > 100 || String(option_b).length > 100) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  // Rate limit: max 3 proposals per user per day
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await admin
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Maximum 3 proposals per day. Try again tomorrow.' }, { status: 429 })
  }

  const { error } = await admin.from('proposals').insert({
    user_id:           user.id,
    title,
    description:       description ?? null,
    category:          category ?? null,
    option_a,
    option_b,
    closes_suggestion: closes_suggestion ?? null,
    status:            'pending',
    vote_count:        0,
  })

  if (error) {
    console.error('[proposals] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to submit proposal' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
