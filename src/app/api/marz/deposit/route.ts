import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { collectMoney, getCollectionStatus } from '@/lib/marz'
import { requestPayment, checkPaymentStatus } from '@/lib/relworx'

function toInternational(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

export async function POST(req: NextRequest) {
  try {
    return await handleDeposit(req)
  } catch (err) {
    console.error('[deposit] unhandled:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Deposit failed. Please try again.' }, { status: 500 })
  }
}

async function handleDeposit(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, phone } = await req.json()
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1000 || amount > 200_000) {
    return NextResponse.json({ error: 'Deposit must be between UGX 1,000 and UGX 200,000' }, { status: 400 })
  }

  const { data: profile } = await admin.from('profiles')
    .select('phone, self_excluded_until, daily_deposit_limit, suspended')
    .eq('id', user.id).single()

  if (profile?.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
  }

  // Rate limit: 5 deposit requests per 10 minutes per user
  const depositWindow = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count: recentDeposits } = await admin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'deposit')
    .gte('created_at', depositWindow)
  if ((recentDeposits ?? 0) >= 5) {
    return NextResponse.json({ error: 'Too many deposit attempts. Please wait 10 minutes.' }, { status: 429 })
  }

  const rawPhone = phone ?? profile?.phone ?? ''
  if (!rawPhone) return NextResponse.json({ error: 'No phone number on file' }, { status: 400 })

  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    const until = new Date(profile.self_excluded_until).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })
    return NextResponse.json({ error: `Account self-excluded until ${until}` }, { status: 403 })
  }

  if (profile?.daily_deposit_limit) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const { data: todayTxns } = await admin.from('transactions')
      .select('amount').eq('user_id', user.id).eq('type', 'deposit')
      .eq('status', 'completed').gte('created_at', startOfDay.toISOString())
    const todayTotal = (todayTxns ?? []).reduce((s, t) => s + Number(t.amount), 0)
    if (todayTotal + amount > profile.daily_deposit_limit) {
      const remaining = Math.max(0, profile.daily_deposit_limit - todayTotal)
      return NextResponse.json({
        error: `Daily deposit limit reached. Remaining allowance today: UGX ${remaining.toLocaleString()}`,
      }, { status: 403 })
    }
  }

  const phone_number = toInternational(rawPhone)
  const reference = crypto.randomUUID()

  // Insert transaction record BEFORE gateway call so we have an audit trail
  // even if the server crashes mid-flight or the gateway response is never received.
  await admin.from('transactions').insert({
    user_id: user.id,
    type: 'deposit',
    amount,
    status: 'pending',
    reference,
    metadata: { phone: phone_number },
  })

  let gateway: 'relworx' | 'marzpay'
  let gatewayMeta: Record<string, string>

  // MarzPay primary → Relworx fallback
  let marzError = ''
  let relworxError = ''
  try {
    const result = await collectMoney({ phone_number, amount, reference, description: 'Sabula 256 deposit' })
    gateway = 'marzpay'
    gatewayMeta = { phone: phone_number, marz_uuid: result.data.transaction.uuid }
  } catch (e) {
    marzError = e instanceof Error ? e.message : String(e)
    const myIp = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => 'unknown')
    console.error('[deposit] marzpay failed:', marzError, '| outbound IP was:', myIp)
    try {
      const result = await requestPayment({ msisdn: phone_number, amount, reference, description: 'Sabula 256 deposit' })
      gateway = 'relworx'
      gatewayMeta = { phone: phone_number, internal_reference: result.internal_reference }
      console.log('[deposit] relworx accepted:', result.internal_reference, '| phone:', phone_number)
    } catch (e2) {
      relworxError = e2 instanceof Error ? e2.message : String(e2)
      await admin.from('transactions').update({
        status: 'failed',
        metadata: { phone: phone_number, marz_error: marzError, relworx_error: relworxError },
      }).eq('reference', reference)
      console.error('[deposit] relworx also failed:', relworxError)
      return NextResponse.json({ error: 'Payment request failed. Please try again.' }, { status: 502 })
    }
  }

  // Update transaction with gateway metadata now that we have it
  await admin.from('transactions').update({
    metadata: { gateway, ...gatewayMeta },
  }).eq('reference', reference)

  return NextResponse.json({ success: true, reference })
}

// GET — poll deposit status
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ref = req.nextUrl.searchParams.get('ref')
  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 })

  const { data: txn } = await admin.from('transactions')
    .select('*').eq('user_id', user.id).eq('reference', ref).single()

  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (txn.status === 'completed')  return NextResponse.json({ status: 'completed', balance: txn.balance_after })
  if (txn.status === 'failed')     return NextResponse.json({ status: 'failed' })
  if (txn.status === 'processing') return NextResponse.json({ status: 'pending' })  // webhook in flight

  const gateway = txn.metadata?.gateway ?? 'relworx'

  try {
    let gatewaySuccess = false
    let gatewayFailed  = false

    if (gateway === 'marzpay') {
      const marzUuid = txn.metadata?.marz_uuid
      if (!marzUuid) return NextResponse.json({ status: 'pending' })
      const result = await getCollectionStatus(marzUuid)
      const txStatus = result.data?.transaction?.status
      if (txStatus === 'successful')                        gatewaySuccess = true
      if (txStatus === 'failed' || txStatus === 'cancelled') gatewayFailed = true
    } else {
      const internalRef = txn.metadata?.internal_reference
      if (!internalRef) return NextResponse.json({ status: 'pending' })
      const result = await checkPaymentStatus(internalRef)
      console.log('[poll] relworx status:', JSON.stringify(result))
      if (result.request_status === 'success') gatewaySuccess = true
      if (result.request_status === 'failed')  gatewayFailed  = true
    }

    if (gatewaySuccess) {
      // Atomic idempotency flip: only one winner (webhook vs polling) credits the wallet
      const { data: claimed } = await admin
        .from('transactions')
        .update({ status: 'processing' })
        .eq('id', txn.id)
        .eq('status', 'pending')
        .select('amount')
        .single()
      if (!claimed) {
        // Webhook already handled it — re-fetch current balance
        const { data: fresh } = await admin.from('transactions').select('status, balance_after').eq('id', txn.id).single()
        if (fresh?.status === 'completed') return NextResponse.json({ status: 'completed', balance: fresh.balance_after })
        return NextResponse.json({ status: 'pending' })
      }
      const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
      const newBalance = Number(wallet?.balance ?? 0) + Number(claimed.amount)
      await Promise.all([
        admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user.id),
        admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
      ])
      return NextResponse.json({ status: 'completed', balance: newBalance })
    }

    if (gatewayFailed) {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id).eq('status', 'pending')
      return NextResponse.json({ status: 'failed' })
    }
  } catch { /* keep polling */ }

  return NextResponse.json({ status: 'pending' })
}
