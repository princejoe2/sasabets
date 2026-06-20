import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, closesAt, options, verificationType, verificationConfig } = await req.json()
  if (!title || !options || options.length < 2) {
    return NextResponse.json({ error: 'Invalid market data' }, { status: 400 })
  }

  const { data, error } = await admin.from('markets').insert({
    title,
    description,
    options,
    closes_at:           closesAt,
    created_by:          user.id,
    status:              'open',
    total_pool:          0,
    rake_pct:            0.08,
    verification_type:   verificationType   ?? 'manual',
    verification_config: verificationConfig ?? {},
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
