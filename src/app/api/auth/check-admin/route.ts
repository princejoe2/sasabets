import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ isAdmin: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('phone', phone)
    .single()

  return NextResponse.json({ isAdmin: data?.is_admin ?? false })
}
