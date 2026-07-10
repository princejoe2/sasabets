import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  const { admin, user } = g

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
