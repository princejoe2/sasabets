import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { marketId } = await req.json()
  if (!marketId) return NextResponse.json({ error: 'Missing marketId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: market } = await admin
    .from('markets')
    .select('id, status, closes_at')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (market.status !== 'open') return NextResponse.json({ ok: true }) // already closed/settled

  // Only close if closes_at has actually passed
  if (market.closes_at && new Date(market.closes_at) > new Date()) {
    return NextResponse.json({ ok: true }) // not expired yet
  }

  await admin.from('markets')
    .update({ status: 'closed' })
    .eq('id', marketId)
    .eq('status', 'open') // safety: only update if still open

  return NextResponse.json({ ok: true, closed: true })
}
