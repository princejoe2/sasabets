import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  // Approving/rejecting real-money withdrawals: super-admin only, with TOTP enforced.
  const g = await guardAdmin()
  if ('error' in g) return g.error
  const admin = g.admin

  let parsed: unknown
  try { parsed = await req.json() } catch { parsed = null }
  const transactionId = (parsed as { transactionId?: unknown } | null)?.transactionId
  const action = (parsed as { action?: unknown } | null)?.action
  if (typeof transactionId !== 'string' || typeof action !== 'string' || !['complete', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Atomically claim the row: only a still-`pending` withdrawal can be acted on, and
  // the claim is what flips it out of `pending`. This closes the race with the gateway
  // webhook (which also claims pending→processing) so the txn is finalised — and any
  // refund issued — at most once, by whichever path wins. No separate read-then-write.
  const targetStatus = action === 'complete' ? 'completed' : 'failed'
  const { data: txn } = await admin
    .from('transactions')
    .update({ status: targetStatus })
    .eq('id', transactionId)
    .eq('type', 'withdrawal')
    .eq('status', 'pending')
    .select('*')
    .single()

  if (!txn) return NextResponse.json({ error: 'Withdrawal not found or already processed' }, { status: 404 })

  if (action === 'reject') {
    // We won the claim — refund the originally debited amount atomically, exactly once.
    const refundAmt = Math.abs(Number(txn.amount))
    await admin.rpc('adjust_wallet_balance', { p_user_id: txn.user_id, p_delta: refundAmt })
  }

  return NextResponse.json({ success: true })
}
