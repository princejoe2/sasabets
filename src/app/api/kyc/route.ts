import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id_type, id_number, first_name, last_name } = await req.json()
  if (!id_type || !id_number || !first_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const VALID_ID_TYPES = ['national_id', 'passport', 'drivers_license', 'refugee_id']
  if (!VALID_ID_TYPES.includes(String(id_type))) {
    return NextResponse.json({ error: 'Invalid ID type' }, { status: 400 })
  }
  if (String(id_number).length > 50 || String(first_name).length > 50) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  const { data: existing } = await admin.from('profiles')
    .select('kyc_status')
    .eq('id', user.id)
    .single()

  if (existing?.kyc_status === 'approved') {
    return NextResponse.json({ error: 'Already verified' }, { status: 400 })
  }
  if (existing?.kyc_status === 'pending') {
    return NextResponse.json({ error: 'Already under review' }, { status: 400 })
  }

  const full_name = last_name ? `${first_name} ${last_name}` : first_name

  const { error } = await admin.from('profiles').update({
    kyc_id_type:   id_type,
    kyc_id_number: id_number,
    kyc_status:    'pending',
    full_name,
  }).eq('id', user.id)

  if (error) {
    console.error('[kyc] update failed:', error.message)
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
