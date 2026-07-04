import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { detectAmlFlags } from '@/lib/aml-flags'

async function assertAdmin() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? admin : null
}

export async function GET(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const flags = await detectAmlFlags(admin)
    return NextResponse.json(flags)
  } catch (error) {
    console.error('[admin/aml] detection failed:', error)
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 })
  }
}
