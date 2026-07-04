import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if ('daily_deposit_limit' in body) {
    const limit = body.daily_deposit_limit
    if (limit !== null && (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0)) {
      return NextResponse.json({ error: 'Invalid deposit limit' }, { status: 400 })
    }
    update.daily_deposit_limit = limit
  }

  if ('self_excluded_until' in body) {
    const newDate = body.self_excluded_until

    if (newDate !== null) {
      const newUntil = new Date(newDate)
      if (isNaN(newUntil.getTime()) || newUntil <= new Date()) {
        return NextResponse.json({ error: 'Self-exclusion date must be in the future' }, { status: 400 })
      }

      // Fetch current exclusion — user can only extend, not shorten or clear
      const { data: profile } = await admin.from('profiles').select('self_excluded_until').eq('id', user.id).single()
      if (profile?.self_excluded_until) {
        const currentUntil = new Date(profile.self_excluded_until)
        if (newUntil < currentUntil) {
          return NextResponse.json({ error: 'You cannot shorten an active self-exclusion. Contact support to review.' }, { status: 403 })
        }
      }
      update.self_excluded_until = newDate
    } else {
      // User cannot clear self-exclusion themselves
      return NextResponse.json({ error: 'Self-exclusion can only be removed by support. Contact us.' }, { status: 403 })
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
