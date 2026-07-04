import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to flag a market' }, { status: 401 })

  const VALID_REASONS = ['Wrong winner declared', 'Outcome not yet determined', 'Evidence seems incorrect', 'Other']
  const { reason } = await req.json()
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('market_flags').insert({
    user_id: user.id,
    market_id: (await params).id,
    reason,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already flagged' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to submit flag' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
