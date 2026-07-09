import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  const g = await guardAdmin(['support'])
  if ('error' in g) return g.error
  const { admin } = g

  const { userId, status } = await req.json()
  if (!userId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update({
    kyc_status: status,
  }).eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
