import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const UG_PHONE_RE = /^(\+256|256|0)(7\d{8}|39\d{7})$/

// Called after email OTP verification to persist phone + name to the profile.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimit(`reg:${user.id}`, 5, 3600)  // 5 per hour per user
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { phone, name } = await req.json()

  const admin = createAdminClient()
  const update: Record<string, string> = {}

  if (phone) {
    const raw = String(phone).replace(/[\s\-()]/g, '')
    if (!UG_PHONE_RE.test(raw)) {
      return NextResponse.json({ error: 'Invalid Uganda phone number' }, { status: 400 })
    }
    update.phone = raw
  }
  if (name) {
    const trimmed = String(name).trim().slice(0, 100)
    if (trimmed) update.full_name = trimmed
  }

  if (Object.keys(update).length > 0) {
    await admin.from('profiles').update(update).eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}
