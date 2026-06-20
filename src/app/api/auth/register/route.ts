import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { phone, password, name } = await req.json()
  if (!phone || !password) {
    return NextResponse.json({ error: 'Phone and password required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { full_name: name || null, phone },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (name && data.user) {
    await admin.from('profiles').update({ full_name: name, phone }).eq('id', data.user.id)
  }

  return NextResponse.json({ success: true })
}
