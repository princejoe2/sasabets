import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requestPayment, checkPaymentStatus } from '@/lib/relworx'

function toInternational(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

// POST — initiate deposit (sends USSD push to phone)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, phone } = await req.json()
  if (!amount || amount < 1000) {
    return NextResponse.json({ error: 'Minimum deposit is UGX 1,000' }, { status: 400 })
  }

  const { data: profile } = await admin.from('profiles')
    .select('phone, self_excluded_until, daily_deposit_limit')
    .eq('id', user.id).single()
  const rawPhone = phone ?? profile?.phone ?? ''
  if (!rawPhone) return NextResponse.json({ error: 'No phone number on file' }, { status: 400 })

  // Self-exclusion check
  if (profile?.self_excluded_until && new Date(profile.self_excluded_until) > new Date()) {
    const until = new Date(profile.self_excluded_until).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })
    return NextResponse.json({ error: `Account self-excluded until ${until}` }, { status: 403 })
  }

  // Daily deposit limit check
  if (profile?.daily_deposit_limit) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: todayTxns } = await admin.from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'deposit')
      .eq('status', 'completed')
      .gte('created_at', startOfDay.toISOString())
    const todayTotal = (todayTxns ?? []).reduce((s, t) => s + Number(t.amount), 0)
    if (todayTotal + amount > profile.daily_deposit_limit) {
      const remaining = Math.max(0, profile.daily_deposit_limit - todayTotal)
      return NextResponse.json({
        error: `Daily deposit limit reached. Remaining allowance today: UGX ${remaining.toLocaleString()}`,
      }, { status: 403 })
    }
  }

  const msisdn = toInternational(rawPhone)
  const reference = `DEP-${user.id.slice(0, 8)}-${Date.now()}`

  let internalReference: string
  try {
    const result = await requestPayment({ msisdn, amount, reference, description: 'Sabula 256 deposit' })
    internalReference = result.internal_reference
  } catch (err) {
    console.error('[relworx/deposit] gateway error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Payment request failed. Please try again.' }, { status: 502 })
  }

  const { error: txnErr } = await admin.from('transactions').insert({
    user_id: user.id,
    type: 'deposit',
    amount,
    status: 'pending',
    reference,
    metadata: { phone: msisdn, internal_reference: internalReference },
  })

  if (txnErr) {
    console.error('Transaction insert failed:', txnErr.message)
    return NextResponse.json({ error: 'Transaction record failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, reference, internalReference })
}

// GET — poll deposit status
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ref = req.nextUrl.searchParams.get('ref')
  if (!ref) return NextResponse.json({ error: 'Missing ref' }, { status: 400 })

  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('reference', ref)
    .single()

  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (txn.status === 'completed')  return NextResponse.json({ status: 'completed', balance: txn.balance_after })
  if (txn.status === 'failed')     return NextResponse.json({ status: 'failed' })
  if (txn.status === 'processing') return NextResponse.json({ status: 'pending' })  // webhook in flight

  // Still pending — check with Relworx
  const internalReference = txn.metadata?.internal_reference
  if (!internalReference) return NextResponse.json({ status: 'pending' })

  try {
    const relworxStatus = await checkPaymentStatus(internalReference)
    if (relworxStatus.request_status === 'success') {
      // Atomic flip to prevent double-credit if webhook also fires
      const { data: claimed } = await admin
        .from('transactions')
        .update({ status: 'processing' })
        .eq('id', txn.id)
        .eq('status', 'pending')
        .select('amount')
        .single()
      if (!claimed) {
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
    if (relworxStatus.request_status === 'failed') {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id).eq('status', 'pending')
      return NextResponse.json({ status: 'failed' })
    }
  } catch {
    // Relworx unreachable — return pending, keep polling
  }

  return NextResponse.json({ status: 'pending' })
}
