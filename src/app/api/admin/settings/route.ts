import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getAdminOrUnauthorized() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user, admin }
}

export async function GET() {
  const result = await getAdminOrUnauthorized()
  if ('error' in result) return result.error

  const { data, error } = await result.admin.from('platform_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const result = await getAdminOrUnauthorized()
  if ('error' in result) return result.error

  const body = await req.json()

  const { error } = await result.admin.from('platform_settings').upsert(
    Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: result.user.id,
    })),
    { onConflict: 'key' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
