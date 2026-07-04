import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCollectionStatus } from '@/lib/marz'
import { checkPaymentStatus } from '@/lib/relworx'
import { maybeFireReferralBonus } from '@/lib/referral'

// Deposits are considered stuck if they've been pending/processing for more than this long
const STUCK_AFTER_MS = 15 * 60 * 1000  // 15 minutes

async function isAdminUser() {
  const supabase = await createClient()
  const admin    = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? admin : null
}

// GET — list stuck deposits (pending/processing > 15 min)
export async function GET() {
  const admin = await isAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString()

  const { data: stuck } = await admin.from('transactions')
    .select('id, user_id, amount, status, reference, metadata, created_at')
    .eq('type', 'deposit')
    .in('status', ['pending', 'processing'])
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ stuck: stuck ?? [], count: (stuck ?? []).length })
}

// POST — check each stuck deposit against the gateway and resolve
export async function POST() {
  const admin = await isAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString()

  const { data: stuck } = await admin.from('transactions')
    .select('id, user_id, amount, status, reference, metadata, created_at')
    .eq('type', 'deposit')
    .in('status', ['pending', 'processing'])
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(50)

  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ resolved: 0, failed: 0, skipped: 0, results: [] })
  }

  let resolved = 0
  let failed   = 0
  let skipped  = 0
  const results: Array<{ id: string; reference: string; outcome: string }> = []

  for (const txn of stuck) {
    const gateway  = txn.metadata?.gateway ?? 'marzpay'
    let gatewayOk  = false
    let gatewayFail = false

    try {
      if (gateway === 'marzpay') {
        const marzUuid = txn.metadata?.marz_uuid
        if (!marzUuid) { skipped++; results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'skip:no_uuid' }); continue }
        const result = await getCollectionStatus(marzUuid)
        const s = result.data?.transaction?.status
        if (s === 'successful') gatewayOk = true
        if (s === 'failed' || s === 'cancelled') gatewayFail = true
      } else {
        const internalRef = txn.metadata?.internal_reference
        if (!internalRef) { skipped++; results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'skip:no_ref' }); continue }
        const result = await checkPaymentStatus(internalRef)
        if (result.request_status === 'success') gatewayOk = true
        if (result.request_status === 'failed')  gatewayFail = true
      }
    } catch {
      skipped++
      results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'skip:gateway_error' })
      continue
    }

    if (gatewayOk) {
      // Atomic claim: prevent double-credit if webhook arrives concurrently
      const { data: claimed } = await admin.from('transactions')
        .update({ status: 'processing' })
        .eq('id', txn.id)
        .in('status', ['pending', 'processing'])
        .select('amount')
        .single()

      if (!claimed) {
        skipped++
        results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'skip:already_processing' })
        continue
      }

      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: txn.user_id,
        p_delta:   Number(txn.amount),
      })
      await admin.from('transactions').update({ status: 'completed', balance_after: newBalance ?? null }).eq('id', txn.id)
      await maybeFireReferralBonus(admin, txn.user_id, txn.id)
      resolved++
      results.push({ id: txn.id, reference: txn.reference ?? '', outcome: `resolved:credited_${txn.amount}` })

    } else if (gatewayFail) {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id).in('status', ['pending', 'processing'])
      failed++
      results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'failed:gateway_failed' })

    } else {
      skipped++
      results.push({ id: txn.id, reference: txn.reference ?? '', outcome: 'skip:still_pending' })
    }
  }

  return NextResponse.json({ resolved, failed, skipped, results })
}
