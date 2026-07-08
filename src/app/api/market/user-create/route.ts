import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendPush, type StoredSubscription } from '@/lib/push'
import { generateAccessToken, hashAccessToken } from '@/lib/market-token'
import { pingIndexNow } from '@/lib/indexnow'
import { sendAdminApprovalRequest } from '@/lib/whatsapp'

const LAUNCH_STAKE = 5_000

const CATEGORY_MAP: Record<string, string> = {
  football: 'football', politics: 'politics', economy: 'economy',
  entertainment: 'entertainment', tech: 'tech', infrastructure: 'infrastructure',
  agriculture: 'agriculture', other: 'default',
}

const BLOCKED_PHRASES = [
  'fuck', 'shit', 'nigger', 'nigga', 'kaffir', 'bitch', 'whore', 'cunt',
  'kill yourself', 'suicide', 'rape', 'porn', 'sex tape', 'naked',
  'child porn', 'pedophil', 'terrorist', 'bomb', 'genocide',
]

function containsBlocked(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_PHRASES.some(p => lower.includes(p))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to create a market' }, { status: 401 })

  const { title, description, optionA, optionB, category, resolutionCriteria, closesAt, betSide, isPrivate } = await req.json()

  if (!title?.trim() || !optionA?.trim() || !optionB?.trim()) {
    return NextResponse.json({ error: 'Title and both sides are required' }, { status: 400 })
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: 'Title is too long (max 200 characters)' }, { status: 400 })
  }
  if (!['a', 'b'].includes(betSide)) {
    return NextResponse.json({ error: 'Choose which side you are backing to launch' }, { status: 400 })
  }
  if (optionA.trim().length > 80 || optionB.trim().length > 80) {
    return NextResponse.json({ error: 'Option labels are too long (max 80 characters)' }, { status: 400 })
  }
  if (typeof description === 'string' && description.length > 2000) {
    return NextResponse.json({ error: 'Description is too long (max 2,000 characters)' }, { status: 400 })
  }
  if (typeof resolutionCriteria === 'string' && resolutionCriteria.length > 500) {
    return NextResponse.json({ error: 'Resolution criteria is too long (max 500 characters)' }, { status: 400 })
  }
  const resolutionText = typeof resolutionCriteria === 'string' && resolutionCriteria.trim()
    ? resolutionCriteria.trim()
    : null

  // Closing date must be a real timestamp in the future (max 1 year out)
  let closesAtIso: string | null = null
  if (closesAt) {
    const d = new Date(closesAt)
    if (isNaN(d.getTime()) || d <= new Date()) {
      return NextResponse.json({ error: 'Closing date must be in the future' }, { status: 400 })
    }
    if (d > new Date(Date.now() + 366 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Closing date cannot be more than a year away' }, { status: 400 })
    }
    closesAtIso = d.toISOString()
  }

  // Content filter
  const allText = [title, optionA, optionB, description ?? '', resolutionText ?? ''].join(' ')
  if (containsBlocked(allText)) {
    return NextResponse.json({
      error: 'Your market contains content that is not allowed. Please revise the title or options.',
    }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone, suspended, self_excluded_until')
    .eq('id', user.id)
    .single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  }
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    return NextResponse.json({ error: 'You have self-excluded from betting.' }, { status: 403 })
  }

  // Rate limit: max 5 user-created markets per day — by user_id AND phone
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: todayByUser } = await admin
    .from('markets')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', dayAgo)
  if ((todayByUser ?? 0) >= 5) {
    return NextResponse.json({ error: 'You can create up to 5 markets per day' }, { status: 429 })
  }
  // Phone-level rate limit: prevents bypass via multiple accounts on same number
  if (profile?.phone) {
    const { data: phoneUsers } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', profile.phone)
    if (phoneUsers && phoneUsers.length > 1) {
      const phoneUserIds = phoneUsers.map(p => p.id)
      const { count: todayByPhone } = await admin
        .from('markets')
        .select('id', { count: 'exact', head: true })
        .in('created_by', phoneUserIds)
        .gte('created_at', dayAgo)
      if ((todayByPhone ?? 0) >= 5) {
        return NextResponse.json({ error: 'You can create up to 5 markets per day' }, { status: 429 })
      }
    }
  }

  // Check wallet balance
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  if (!wallet || Number(wallet.balance) < LAUNCH_STAKE) {
    return NextResponse.json({
      error: `You need at least UGX ${LAUNCH_STAKE.toLocaleString()} in your wallet to launch a market`,
      balance: Number(wallet?.balance ?? 0),
    }, { status: 400 })
  }

  const cat         = CATEGORY_MAP[category?.toLowerCase() ?? ''] ?? 'default'
  const accessToken = isPrivate ? generateAccessToken() : null
  const options = [
    { id: 'a', label: optionA.trim(), total_pool: 0 },
    { id: 'b', label: optionB.trim(), total_pool: 0 },
  ]

  const { data: market, error: mktErr } = await admin.from('markets').insert({
    title:       title.trim(),
    description: description?.trim() || null,
    options,
    status:      'pending_approval',
    closes_at:   closesAtIso,
    rake_pct:    0.08,
    total_pool:  0,
    created_by:  user.id,
    metadata: {
      category:          cat,
      user_created:      true,
      creator_name:      profile?.full_name ?? 'Community',
      creator_max_stake: LAUNCH_STAKE,
      ...(resolutionText ? { resolution_criteria: resolutionText } : {}),
      ...(isPrivate && accessToken ? { private: true, access_token_hash: hashAccessToken(accessToken) } : {}),
    },
  }).select('id').single()

  if (mktErr || !market) {
    return NextResponse.json({ error: 'Failed to create market' }, { status: 500 })
  }

  // Place launch stake atomically
  const chosenIdx  = betSide === 'a' ? 0 : 1
  const chosenOpt  = options[chosenIdx]
  const updatedOpts = options.map((o, i) =>
    i === chosenIdx ? { ...o, total_pool: LAUNCH_STAKE } : o
  )

  // Atomic deduction via RPC — eliminates read-modify-write race
  const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
    p_user_id: user.id,
    p_delta: -LAUNCH_STAKE,
  })
  if (newBalance === null || newBalance === undefined) {
    await admin.from('markets').delete().eq('id', market.id)
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  await admin.from('markets').update({ options: updatedOpts, total_pool: LAUNCH_STAKE }).eq('id', market.id)

  await admin.from('bets').insert({
    user_id:          user.id,
    market_id:        market.id,
    option_id:        chosenOpt.id,
    amount:           LAUNCH_STAKE,
    potential_payout: LAUNCH_STAKE,
    status:           'active',
    placed_at:        new Date().toISOString(),
  })

  await admin.from('transactions').insert({
    user_id:       user.id,
    type:          'bet',
    amount:        -LAUNCH_STAKE,
    balance_after: Number(newBalance),
    status:        'completed',
    metadata:      { marketId: market.id, optionId: chosenOpt.id, market_launch: true },
  })

  // Notify admin — insert market_event so the community market shows in the events feed
  await admin.from('market_events').insert({
    market_id:  market.id,
    event_type: 'user_market_created',
    payload:    {
      creator_id:   user.id,
      creator_name: profile?.full_name ?? 'Community',
      title:        title.trim(),
      category:     cat,
      needs_review: true,
    },
  }).then(() => {}) // non-fatal — fire and forget

  // Notify admin via WhatsApp — must be awaited before returning or Vercel
  // kills the function before the outbound fetch to UltraMsg completes.
  await notifyAdminForApproval(market.id, title.trim(), options, profile?.full_name ?? 'Community').catch(
    err => console.error('[whatsapp] admin approval error:', err)
  )

  // Push + IndexNow only fire AFTER admin approves (status becomes 'open').
  // Don't notify users or search engines yet — market is not live.

  return NextResponse.json({ marketId: market.id, newBalance: Number(newBalance), accessToken, pendingApproval: true })
}

async function notifyAdminForApproval(
  marketId: string,
  title: string,
  options: Array<{ label: string }>,
  creatorName: string,
) {
  const admin = createAdminClient()
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('phone')
    .eq('is_admin', true)
    .not('phone', 'is', null)
    .limit(1)
    .single()
  if (!adminProfile?.phone) return
  await sendAdminApprovalRequest(adminProfile.phone, { id: marketId, title, options, creatorName })
}

async function notifyNewMarket(marketId: string, title: string, creatorId: string) {
  const admin = createAdminClient()

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    // Don't push to the creator themselves — they already know
    .neq('user_id', creatorId)

  if (!subs?.length) return

  const payload = {
    title: '🔮 New market on Sabula 256',
    body:  title.length > 80 ? title.slice(0, 77) + '…' : title,
    url:   `https://sabula256.com/markets/${marketId}`,
  }

  const results = await Promise.allSettled(
    subs.map(s => sendPush(s as StoredSubscription, payload))
  )

  // Clean up expired subscriptions (status 410 = Gone)
  const gone: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as { statusCode?: number }
      if (err?.statusCode === 410) gone.push(subs[i].endpoint)
    }
  })
  if (gone.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone)
  }
}
