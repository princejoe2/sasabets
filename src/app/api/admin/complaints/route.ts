import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), admin: null }
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), admin: null }
  return { error: null, admin }
}

export async function GET() {
  const { error, admin } = await requireAdmin()
  if (error || !admin) return error

  const { data, error: dbError } = await admin
    .from('complaints')
    .select('id, subject, message, status, admin_note, created_at, updated_at, profiles(phone, full_name)')
    .order('created_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ complaints: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { error, admin } = await requireAdmin()
  if (error || !admin) return error

  let parsed: unknown
  try { parsed = await req.json() } catch { parsed = null }
  const id = (parsed as { id?: unknown } | null)?.id
  const status = (parsed as { status?: unknown } | null)?.status
  const adminNote = (parsed as { admin_note?: unknown } | null)?.admin_note

  if (typeof id !== 'string') {
    return NextResponse.json({ error: 'Complaint id required' }, { status: 400 })
  }

  const update: { status?: string; admin_note?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (status !== undefined) {
    if (typeof status !== 'string' || !['open', 'in_progress', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = status
  }
  if (adminNote !== undefined) {
    update.admin_note = typeof adminNote === 'string' ? adminNote : null
  }

  const { data, error: dbError } = await admin
    .from('complaints')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true, complaint: data })
}
