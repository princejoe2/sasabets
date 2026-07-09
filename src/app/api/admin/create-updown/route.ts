import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await admin.from('markets')
    .select('id, title, closes_at')
    .or('metadata->>type.eq.updown,metadata->>type.eq.price_level')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ markets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { asset, market_type } = body

  const NAMES: Record<string, string> = {
    bitcoin:    'Bitcoin (BTC)',
    'pax-gold': 'Gold (XAU)',
  }
  const assetName = NAMES[asset] ?? asset

  if (market_type === 'updown' || !market_type) {
    const { window_hours, entry_price } = body
    if (!asset || !window_hours || !entry_price) {
      return NextResponse.json({ error: 'Missing asset, window_hours, or entry_price' }, { status: 400 })
    }

    const windowLabel = window_hours === 1 ? '1 hour' : window_hours === 4 ? '4 hours' : `${window_hours} hours`
    const closesAt    = new Date(Date.now() + window_hours * 3_600_000)
    const title       = `Will ${assetName} be higher or lower in ${windowLabel}?`
    const description = `Entry price: $${Number(entry_price).toLocaleString()}. Closes at ${closesAt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })} EAT.`

    const options = [
      { id: 'opt-up',   label: '▲ UP — price higher at close',  total_pool: 0 },
      { id: 'opt-down', label: '▼ DOWN — price lower at close', total_pool: 0 },
    ]

    const { data: market, error } = await admin.from('markets').insert({
      title, description,
      closes_at:  closesAt.toISOString(),
      status:     'open',
      options,
      total_pool: 0,
      rake_pct:   0.08,
      metadata: {
        type:         'updown',
        asset,
        entry_price:  Number(entry_price),
        window_hours: Number(window_hours),
        window_label: windowLabel,
      },
    }).select('id').single()

    if (error || !market) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
    return NextResponse.json({ ok: true, marketId: market.id, title, closes_at: closesAt.toISOString() })
  }

  if (market_type === 'above' || market_type === 'below') {
    const { target_price, closes_at } = body
    if (!asset || !target_price || !closes_at) {
      return NextResponse.json({ error: 'Missing asset, target_price, or closes_at' }, { status: 400 })
    }

    const tgt         = Number(target_price)
    const closesAt    = new Date(closes_at)
    if (isNaN(tgt) || tgt <= 0)        return NextResponse.json({ error: 'Invalid target_price' }, { status: 400 })
    if (closesAt <= new Date())         return NextResponse.json({ error: 'closes_at must be in the future' }, { status: 400 })

    const direction   = market_type === 'above' ? 'above' : 'below'
    const tgtStr      = tgt.toLocaleString('en-US', { maximumFractionDigits: 2 })
    const dateLabel   = closesAt.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })
                      + ' ' + closesAt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })
    const title       = `Will ${assetName} close ${direction} $${tgtStr} by ${dateLabel}?`

    const options = [
      { id: 'opt-yes', label: 'YES', total_pool: 0 },
      { id: 'opt-no',  label: 'NO',  total_pool: 0 },
    ]

    const { data: market, error } = await admin.from('markets').insert({
      title,
      description: `${direction === 'above' ? 'Above' : 'Below'} $${tgtStr} by ${dateLabel} EAT.`,
      closes_at:   closesAt.toISOString(),
      status:      'open',
      options,
      total_pool:  0,
      rake_pct:    0.08,
      metadata: {
        type:         'price_level',
        asset,
        target_price: tgt,
        direction,
      },
    }).select('id').single()

    if (error || !market) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
    return NextResponse.json({ ok: true, marketId: market.id, title, closes_at: closesAt.toISOString() })
  }

  return NextResponse.json({ error: 'Unknown market_type' }, { status: 400 })
}
