import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMarzStats } from '@/lib/marz'

export async function GET() {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: txns }, { data: wallets }, marzStats] = await Promise.all([
    admin.from('transactions').select('type, amount, status, metadata'),
    admin.from('wallets').select('balance'),
    getMarzStats().catch(() => null),
  ])

  const completed      = txns?.filter(t => t.status === 'completed') ?? []
  const totalDeposited = completed.filter(t => t.type === 'deposit').reduce((s,t) => s + Number(t.amount), 0)
  const totalWithdrawn = completed.filter(t => t.type === 'withdrawal').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
  const totalBetVol    = completed.filter(t => t.type === 'bet').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)
  const totalPaidOut   = completed.filter(t => t.type === 'payout').reduce((s,t) => s + Number(t.amount), 0)
  const totalRake      = completed.filter(t => t.type === 'rake').reduce((s,t) => s + Number(t.amount), 0)
  const totalUserFunds = (wallets ?? []).reduce((s,w) => s + Number(w.balance), 0)
  const marzDeposited  = completed.filter(t => t.type === 'deposit' && (t.metadata as Record<string,unknown>)?.gateway === 'marzpay').reduce((s,t) => s + Number(t.amount), 0)
  const marzWithdrawn  = completed.filter(t => t.type === 'withdrawal' && (t.metadata as Record<string,unknown>)?.gateway !== 'relworx').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)

  return NextResponse.json({
    totalDeposited, totalWithdrawn, totalBetVol, totalPaidOut, totalRake, totalUserFunds,
    marzStats, marzDeposited, marzWithdrawn,
  })
}
