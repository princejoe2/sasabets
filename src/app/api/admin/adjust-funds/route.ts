import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { phone, amount, note } = await req.json()
  if (!phone || amount === undefined || amount === null) {
    return NextResponse.json({ error: 'Missing phone or amount' }, { status: 400 })
  }
  const adjAmount = Number(amount)
  if (!Number.isFinite(adjAmount) || Math.abs(adjAmount) > 100_000_000) {
    return NextResponse.json({ error: 'Invalid adjustment amount' }, { status: 400 })
  }

  const { data: targetProfile } = await admin.from('profiles').select('id').eq('phone', phone).single()
  if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Atomic adjustment via RPC — eliminates read-modify-write race between concurrent admin actions
  const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
    p_user_id: targetProfile.id,
    p_delta: adjAmount,
  })
  if (newBalance === null || newBalance === undefined) {
    return NextResponse.json({ error: 'Balance would go negative' }, { status: 400 })
  }

  await admin.from('transactions').insert({
    user_id: targetProfile.id,
    type: adjAmount > 0 ? 'deposit' : 'withdrawal',
    amount: adjAmount,
    balance_after: Number(newBalance),
    status: 'completed',
    metadata: { admin_adjustment: true, note: note ?? 'Manual admin adjustment', admin_id: user.id },
  })

  return NextResponse.json({ success: true, newBalance: Number(newBalance) })
}
