import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
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

const BLOCKED_PHRASES = [
  'fuck', 'shit', 'nigger', 'nigga', 'kaffir', 'bitch', 'whore', 'cunt',
  'kill yourself', 'suicide', 'rape', 'porn', 'sex tape', 'naked',
  'child porn', 'pedophil', 'terrorist', 'bomb', 'genocide',
]
function containsBlocked(text: string): boolean {
  return BLOCKED_PHRASES.some(p => text.toLowerCase().includes(p))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
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
  // Validate closes_suggestion is a real future date (max 1 year out)
  let safeClosesSuggestion: string | null = null
  if (closes_suggestion) {
    const d = new Date(closes_suggestion)
    if (isNaN(d.getTime()) || d <= new Date()) {
      return NextResponse.json({ error: 'Suggested closing date must be in the future' }, { status: 400 })
    }
    if (d > new Date(Date.now() + 366 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Suggested closing date cannot be more than a year away' }, { status: 400 })
    }
    safeClosesSuggestion = d.toISOString()
  }
  if (
    containsBlocked(String(title)) ||
    containsBlocked(String(option_a)) ||
    containsBlocked(String(option_b)) ||
    (description && containsBlocked(String(description)))
  ) {
    return NextResponse.json({ error: 'Proposal contains prohibited content' }, { status: 400 })
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
    closes_suggestion: safeClosesSuggestion,
    status:            'pending',
    vote_count:        0,
  })

  if (error) {
    console.error('[proposals] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to submit proposal' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
