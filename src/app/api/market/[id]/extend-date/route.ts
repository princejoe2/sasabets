import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { newClosingDate } = await req.json()
  if (!newClosingDate) return NextResponse.json({ error: 'newClosingDate required' }, { status: 400 })

  const newDate = new Date(newClosingDate)
  const now = new Date()
  if (isNaN(newDate.getTime()) || newDate <= now) {
    return NextResponse.json({ error: 'New closing date must be in the future' }, { status: 400 })
  }
  // Cap at 90 days from now to prevent creators from locking markets open indefinitely
  const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  if (newDate > maxDate) {
    return NextResponse.json({ error: 'Closing date cannot be extended more than 90 days from today' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: market } = await admin
    .from('markets')
    .select('created_by, status, closes_at')
    .eq('id', (await params).id)
    .single()

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.created_by !== user.id) return NextResponse.json({ error: 'Only the creator can extend the closing date' }, { status: 403 })
  if (market.status !== 'open') return NextResponse.json({ error: 'Only open markets can be extended' }, { status: 400 })

  const currentClose = market.closes_at ? new Date(market.closes_at) : null
  if (currentClose && newDate <= currentClose) {
    return NextResponse.json({ error: 'New closing date must be later than the current one' }, { status: 400 })
  }

  const { error } = await admin
    .from('markets')
    .update({ closes_at: newDate.toISOString() })
    .eq('id', (await params).id)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ ok: true, closes_at: newDate.toISOString() })
}
