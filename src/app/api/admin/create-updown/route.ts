import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin.from('markets')
    .select('id, title, closes_at')
    .contains('metadata', { type: 'updown' })
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ markets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { asset, window_hours, entry_price } = await req.json()
  if (!asset || !window_hours || !entry_price) {
    return NextResponse.json({ error: 'Missing asset, window_hours, or entry_price' }, { status: 400 })
  }

  const NAMES: Record<string, string> = {
    bitcoin: 'Bitcoin (BTC)', ethereum: 'Ethereum (ETH)', solana: 'Solana (SOL)',
    binancecoin: 'BNB', ripple: 'XRP',
  }
  const assetName = NAMES[asset] ?? asset
  const windowLabel = window_hours === 1 ? '1 hour' : window_hours === 4 ? '4 hours' : `${window_hours} hours`

  const closesAt = new Date(Date.now() + window_hours * 3_600_000)
  const title = `Will ${assetName} be higher or lower in ${windowLabel}?`
  const description = `Entry price: $${Number(entry_price).toLocaleString()}. Closes at ${closesAt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })} EAT.`

  const options = [
    { id: 'opt-up',   label: '▲ UP — price higher at close',   total_pool: 0 },
    { id: 'opt-down', label: '▼ DOWN — price lower at close',  total_pool: 0 },
  ]

  const { data: market, error } = await admin.from('markets').insert({
    title,
    description,
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
