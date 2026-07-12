import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function GET() {
  // Platform-wide settings: super-admin only (guardAdmin enforces TOTP for super-admins).
  const g = await guardAdmin()
  if ('error' in g) return g.error

  const { data, error } = await g.admin.from('platform_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json(settings)
}

const ALLOWED_SETTING_KEYS = new Set([
  'maintenance_mode', 'deposits_enabled', 'withdrawals_enabled',
  'market_creation_enabled', 'min_bet', 'max_bet', 'rake_pct_default',
  'kyc_threshold', 'max_withdrawal', 'daily_deposit_limit_default',
  'announcement_banner', 'referral_bonus_amount', 'streak_bonus_7',
  'streak_bonus_14', 'streak_bonus_30',
])

export async function POST(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error

  const body = await req.json()
  const entries = Object.entries(body).filter(([key]) => ALLOWED_SETTING_KEYS.has(key))
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No valid setting keys provided' }, { status: 400 })
  }

  const { error } = await g.admin.from('platform_settings').upsert(
    entries.map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: g.user.id,
    })),
    { onConflict: 'key' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
