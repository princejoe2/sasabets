import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { phones, message } = await req.json()
  if (!phones?.length || !message?.trim()) {
    return NextResponse.json({ error: 'Missing phones or message' }, { status: 400 })
  }

  // Log the notification attempt as a transaction metadata record
  await admin.from('transactions').insert({
    user_id: user.id,
    type: 'system',
    amount: 0,
    status: 'completed',
    metadata: {
      admin_notification: true,
      recipient_count: phones.length,
      message: message.trim(),
      admin_id: user.id,
    },
  })

  // In production: integrate Twilio or Africa's Talking here
  // For now, return simulated success
  return NextResponse.json({ sent: phones.length, failed: 0 })
}
