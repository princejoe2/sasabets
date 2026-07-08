import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPush, type StoredSubscription } from '@/lib/push'
import { sendMarketBroadcast } from '@/lib/whatsapp'
import { pingIndexNow } from '@/lib/indexnow'

async function broadcastNewAdminMarket(marketId: string, title: string) {
  const marketUrl = `https://sabula256.com/markets/${marketId}`
  const db = createAdminClient()

  // Push notifications to all subscribers
  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (subs?.length) {
    await Promise.allSettled(
      subs.map(s => sendPush(s as StoredSubscription, {
        title: '🎯 New Market on Sabula 256',
        body: title,
        url: marketUrl,
      }))
    )
  }

  // WhatsApp broadcast to all users with a phone number
  const { data: profiles } = await db.from('profiles').select('phone').not('phone', 'is', null)
  if (profiles?.length) {
    const phones = profiles.map((p: { phone: string | null }) => p.phone).filter((ph): ph is string => Boolean(ph))
    await sendMarketBroadcast(phones, title, marketUrl).catch(
      (err: unknown) => console.error('[admin/market] WhatsApp broadcast error:', err)
    )
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, closesAt, options, verificationType, verificationConfig, rakePct, category, partyImage, team1Image, team2Image } = await req.json()
  if (!title || !options || options.length < 2) {
    return NextResponse.json({ error: 'Invalid market data' }, { status: 400 })
  }

  // rake_pct must be between 0% and 20% — default 8%
  const rake = rakePct !== undefined ? Number(rakePct) : 0.08
  if (!Number.isFinite(rake) || rake < 0 || rake > 0.20) {
    return NextResponse.json({ error: 'rake_pct must be between 0 and 0.20' }, { status: 400 })
  }

  // Duplicate check — same title (case-insensitive) among open/upcoming markets
  const { data: existing } = await admin
    .from('markets')
    .select('id')
    .ilike('title', title.trim())
    .in('status', ['open', 'upcoming'])
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A market with this title already exists.' }, { status: 409 })
  }

  const VALID_CATS = ['football','politics','economy','entertainment','tech','infrastructure','agriculture','default']
  const safeCategory = category && VALID_CATS.includes(category) ? category : null

  const { data, error } = await admin.from('markets').insert({
    title,
    description,
    options,
    closes_at:           closesAt,
    created_by:          user.id,
    status:              'open',
    total_pool:          0,
    rake_pct:            rake,
    verification_type:   verificationType   ?? 'manual',
    verification_config: verificationConfig ?? {},
    metadata: {
      ...(safeCategory ? { category:   safeCategory } : {}),
      ...(partyImage   ? { partyImage }               : {}),
      ...(team1Image   ? { team1Image }               : {}),
      ...(team2Image   ? { team2Image }               : {}),
    },
  }).select().single()

  if (error) {
    console.error('[admin/market] insert failed:', error.message)
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }

  // Broadcast new market to all users (push + WhatsApp) — non-blocking
  broadcastNewAdminMarket(data.id, title.trim()).catch(
    err => console.error('[admin/market] broadcast error:', err)
  )

  // Ping IndexNow so search engines index the new market immediately
  pingIndexNow(`https://sabula256.com/markets/${data.id}`).catch(() => {})

  return NextResponse.json(data)
}
