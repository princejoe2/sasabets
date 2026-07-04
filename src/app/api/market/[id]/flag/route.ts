import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to flag a market' }, { status: 401 })

  const { reason } = await req.json()
  if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('market_flags').insert({
    user_id: user.id,
    market_id: params.id,
    reason,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already flagged' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to submit flag' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
