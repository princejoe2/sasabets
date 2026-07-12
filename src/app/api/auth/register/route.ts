import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const UG_PHONE_RE = /^(\+256|256|0)(7\d{8}|39\d{7})$/

function toIntl(phone: string): string {
  let d = phone.replace(/[\s\-()]/g, '')
  if (d.startsWith('0'))   d = '+256' + d.slice(1)
  if (d.startsWith('256')) d = '+' + d
  return d
}

// Called after email OTP verification to persist phone + name to the profile.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimit(`reg:${user.id}`, 5, 3600)  // 5 per hour per user
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { phone, name, username } = await req.json()

  const admin = createAdminClient()
  const update: Record<string, string> = {}

  if (phone) {
    const raw = String(phone).replace(/[\s\-()]/g, '')
    if (!UG_PHONE_RE.test(raw)) {
      return NextResponse.json({ error: 'Invalid Uganda phone number' }, { status: 400 })
    }
    const normalized = toIntl(raw)

    // Reject if this number is already registered to a different account
    const { count } = await admin.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalized)
      .neq('id', user.id)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This phone number is already registered to another account.' },
        { status: 409 },
      )
    }

    update.phone = normalized
  }
  if (name) {
    const trimmed = String(name).trim().slice(0, 100)
    if (trimmed) update.full_name = trimmed
  }
  if (username) {
    const u = String(username).trim().toLowerCase().slice(0, 20)
    if (u && /^[a-z0-9_-]{3,20}$/.test(u)) {
      // Uniqueness check
      const { count: uCount } = await admin.from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', u)
        .neq('id', user.id)
      if ((uCount ?? 0) > 0) {
        return NextResponse.json(
          { error: 'That username is already taken. Please choose another.' },
          { status: 409 },
        )
      }
      update.username = u
    }
  }

  if (Object.keys(update).length > 0) {
    await admin.from('profiles').update(update).eq('id', user.id)
  }

  // Capture referral: read sb_ref cookie, look up referrer, set referred_by (once only)
  const refCode = req.cookies.get('sb_ref')?.value
  if (refCode) {
    const { data: existing } = await admin
      .from('profiles').select('referred_by').eq('id', user.id).single()

    if (existing && !existing.referred_by) {
      const { data: referrer } = await admin
        .from('profiles').select('id').eq('referral_code', refCode).limit(1).single()

      if (referrer && referrer.id !== user.id) {
        await admin.from('profiles').update({ referred_by: referrer.id }).eq('id', user.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
