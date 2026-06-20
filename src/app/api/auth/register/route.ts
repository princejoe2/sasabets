import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Called after email OTP verification to persist phone + name to the profile.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone, name } = await req.json()

  const admin = createAdminClient()
  const update: Record<string, string> = {}
  if (phone) update.phone = phone
  if (name)  update.full_name = name

  if (Object.keys(update).length > 0) {
    await admin.from('profiles').update(update).eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}
