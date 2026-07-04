import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const PAGE_SIZE = 30
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 10

function maskPhone(phone: string | null): string {
  if (!phone) return 'User'
  const digits = String(phone).replace(/\D/g, '').slice(-4)
  return `***${digits}`
}

function formatAuthor(fullName: string | null, phone: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
  }
  return maskPhone(phone)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = createAdminClient()
  const marketId = (await params).id
  const before = req.nextUrl.searchParams.get('before')

  let query = admin
    .from('market_comments')
    .select('id, content, created_at, user_id, profiles(full_name, phone)')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ comments: [], hasMore: false })

  const hasMore = (data?.length ?? 0) > PAGE_SIZE
  const rows = (hasMore ? data!.slice(0, PAGE_SIZE) : data ?? [])

  const comments = rows.map((row) => {
    const profile = row.profiles as unknown as { full_name: string | null; phone: string | null }
    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author: formatAuthor(profile?.full_name ?? null, profile?.phone ?? null),
      user_id: row.user_id,
    }
  })

  return NextResponse.json({ comments, hasMore })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Login to comment' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { body = null }
  const content = (body as { content?: unknown } | null)?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 characters)' }, { status: 400 })
  }

  // Rate limit
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count } = await admin
    .from('market_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: 'Too many comments. Please wait before commenting again.' }, { status: 429 })
  }

  const { data: comment, error } = await admin
    .from('market_comments')
    .insert({ market_id: (await params).id, user_id: user.id, content: content.trim() })
    .select('id, content, created_at, user_id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    comment: {
      ...comment,
      author: formatAuthor(profile?.full_name ?? null, profile?.phone ?? null),
    },
  }, { status: 201 })
}
