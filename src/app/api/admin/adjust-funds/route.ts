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

  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', targetProfile.id).single()
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  const newBalance = Number(wallet.balance) + adjAmount
  if (newBalance < 0) return NextResponse.json({ error: 'Balance would go negative' }, { status: 400 })

  await admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', targetProfile.id)
  await admin.from('transactions').insert({
    user_id: targetProfile.id,
    type: adjAmount > 0 ? 'deposit' : 'withdrawal',
    amount: adjAmount,
    balance_after: newBalance,
    status: 'completed',
    metadata: { admin_adjustment: true, note: note ?? 'Manual admin adjustment', admin_id: user.id },
  })

  return NextResponse.json({ success: true, newBalance })
}
