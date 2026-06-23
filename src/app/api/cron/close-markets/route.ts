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

  const ids = regular.map(m => m.id)
  const { error: updateError } = await admin
    .from('markets')
    .update({ status: 'closed' })
    .in('id', ids)
    .eq('status', 'open')

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ closed: ids.length, ids })
}
