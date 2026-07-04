import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: unknown
  try { parsed = await req.json() } catch { parsed = null }
  const subject = (parsed as { subject?: unknown } | null)?.subject
  const message = (parsed as { message?: unknown } | null)?.message
  if (typeof subject !== 'string' || !subject.trim() || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }
  if (subject.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: 'Subject (max 200) or message (max 5,000) is too long' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('complaints')
    .insert({ user_id: user.id, subject: subject.trim(), message: message.trim() })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, complaint: data })
}

export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('complaints')
    .select('id, subject, message, status, admin_note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ complaints: data ?? [] })
}
