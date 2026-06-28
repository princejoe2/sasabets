import { createAdminClient } from '@/lib/supabase/server'
import AdminFundsClient from '@/components/admin/AdminFundsClient'
import AdminFundsSummary from '@/components/admin/AdminFundsSummary'
import { getMarzStats } from '@/lib/marz'

export const dynamic = 'force-dynamic'

export default async function AdminFundsPage() {
  const admin = createAdminClient()

  const [{ data: txns }, { data: wallets }, { data: profiles }, marzStats] = await Promise.all([
    admin.from('transactions').select('type, amount, status, created_at, metadata'),
    admin.from('wallets').select('user_id, balance'),
    admin.from('profiles').select('id, phone, full_name'),
    getMarzStats().catch(() => null),
  ])

  const completed      = txns?.filter(t => t.status === 'completed') ?? []
  const totalDeposited = completed.filter(t => t.type === 'deposit').reduce((s,t) => s+Number(t.amount), 0)
  const totalWithdrawn = completed.filter(t => t.type === 'withdrawal').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)
  const totalBetVol    = completed.filter(t => t.type === 'bet').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)
  const totalPaidOut   = completed.filter(t => t.type === 'payout').reduce((s,t) => s+Number(t.amount), 0)
  const totalRake      = completed.filter(t => t.type === 'rake').reduce((s,t) => s+Number(t.amount), 0)
  const totalExitFees  = completed.filter(t => t.type === 'exit_fee').reduce((s,t) => s+Number(t.amount), 0)
  const totalUserFunds = (wallets ?? []).reduce((s,w) => s+Number(w.balance), 0)

  // Split by gateway so reconciliation only compares MarzPay ↔ MarzPay
  const marzDeposited   = completed.filter(t => t.type === 'deposit' && t.metadata?.gateway === 'marzpay').reduce((s,t) => s+Number(t.amount), 0)
  const marzWithdrawn   = completed.filter(t => t.type === 'withdrawal' && t.metadata?.gateway !== 'relworx').reduce((s,t) => s+Math.abs(Number(t.amount)), 0)

  const walletList = (wallets ?? []).map(w => {
    const profile = profiles?.find(p => p.id === w.user_id)
    return { ...w, balance: Number(w.balance), phone: profile?.phone ?? '—', name: profile?.full_name ?? null }
  }).sort((a,b) => b.balance - a.balance)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Funds & Rake</h1>
        <p className="mt-1 text-slate-500">Platform revenue, balances, and manual adjustments</p>
      </div>

      <AdminFundsSummary
        initial={{ totalDeposited, totalWithdrawn, totalBetVol, totalPaidOut, totalRake, totalExitFees, totalUserFunds, marzStats, marzDeposited, marzWithdrawn }}
      />

      <AdminFundsClient wallets={walletList} />
    </div>
  )
}
