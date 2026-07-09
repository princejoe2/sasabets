import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

const SUPPORT_MAX = 100_000  // UGX hard limit per adjustment for non-super-admin

export async function POST(req: NextRequest) {
  const g = await guardAdmin(['support'])
  if ('error' in g) return g.error
  const { admin, user, isSuperAdmin } = g

  const { phone, amount, note } = await req.json()
  if (!phone || amount === undefined || amount === null) {
    return NextResponse.json({ error: 'Missing phone or amount' }, { status: 400 })
  }
  const adjAmount = Number(amount)
  if (!Number.isFinite(adjAmount) || Math.abs(adjAmount) > 100_000_000) {
    return NextResponse.json({ error: 'Invalid adjustment amount' }, { status: 400 })
  }

  // Support staff cannot move more than UGX 100,000 per adjustment
  if (!isSuperAdmin && Math.abs(adjAmount) > SUPPORT_MAX) {
    return NextResponse.json({
      error: `Adjustments over UGX ${SUPPORT_MAX.toLocaleString()} require super admin approval. Please contact the super admin.`,
    }, { status: 403 })
  }

  const { data: targetProfile } = await admin.from('profiles').select('id').eq('phone', phone).single()
  if (!targetProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Atomic adjustment via RPC
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
    metadata: {
      admin_adjustment: true,
      note: note ?? 'Manual admin adjustment',
      admin_id: user.id,
      performed_by_role: isSuperAdmin ? 'super_admin' : 'support',
    },
  })

  return NextResponse.json({ success: true, newBalance: Number(newBalance) })
}
