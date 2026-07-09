import { NextResponse } from 'next/server'
import { getMarzStats } from '@/lib/marz'
import { guardAdmin } from '@/lib/admin-guard'

export async function GET() {
  const g = await guardAdmin(['analyst', 'support'])
  if ('error' in g) return g.error
  const { admin } = g

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
  const totalExitFees  = completed.filter(t => t.type === 'exit_fee').reduce((s,t) => s + Number(t.amount), 0)
  const totalUserFunds = (wallets ?? []).reduce((s,w) => s + Number(w.balance), 0)
  const marzDeposited  = completed.filter(t => t.type === 'deposit' && (t.metadata as Record<string,unknown>)?.gateway === 'marzpay').reduce((s,t) => s + Number(t.amount), 0)
  const marzWithdrawn  = completed.filter(t => t.type === 'withdrawal' && (t.metadata as Record<string,unknown>)?.gateway !== 'relworx').reduce((s,t) => s + Math.abs(Number(t.amount)), 0)

  return NextResponse.json({
    totalDeposited, totalWithdrawn, totalBetVol, totalPaidOut, totalRake, totalExitFees, totalUserFunds,
    marzStats, marzDeposited, marzWithdrawn,
  })
}
