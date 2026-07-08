import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMarketBroadcast } from '@/lib/whatsapp'

const MAX_FEATURED = 3

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { featured?: boolean; broadcast?: boolean }
  const { featured, broadcast = false } = body

  if (typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'featured (boolean) is required' }, { status: 400 })
  }

  const { data: market } = await admin
    .from('markets')
    .select('id, title, is_featured, status')
    .eq('id', id)
    .single()
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  // Enforce max 3 featured (only when featuring a market that isn't already featured)
  if (featured && !market.is_featured) {
    const { count } = await admin
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)

    if ((count ?? 0) >= MAX_FEATURED) {
      return NextResponse.json(
        { error: `Only ${MAX_FEATURED} markets can be featured at once. Unfeature one first.` },
        { status: 409 }
      )
    }
  }

  if (market.is_featured !== featured) {
    const { error } = await admin.from('markets').update({ is_featured: featured }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // WhatsApp broadcast (only when featuring, not unfeaturing)
  let broadcastResult: { sent: number; failed: number; recipientCount: number; error?: string } | null = null
  if (featured && broadcast) {
    try {
      const { data: opted } = await admin
        .from('profiles')
        .select('phone')
        .eq('whatsapp_opted_in', true)
        .not('phone', 'is', null)

      const phones = (opted ?? []).map(p => p.phone as string).filter(Boolean)

      if (phones.length > 0) {
        const result = await sendMarketBroadcast(
          phones,
          market.title,
          `https://sabula256.com/markets/${id}`,
        )
        broadcastResult = { ...result, recipientCount: phones.length }
      } else {
        broadcastResult = { sent: 0, failed: 0, recipientCount: 0 }
      }
    } catch (e) {
      broadcastResult = { sent: 0, failed: 0, recipientCount: 0, error: String(e) }
    }
  }

  return NextResponse.json({ is_featured: featured, broadcast: broadcastResult })
}
