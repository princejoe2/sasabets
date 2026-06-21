import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { collectMoney, getCollectionStatus } from '@/lib/marz'

function toInternational(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

// POST — initiate deposit (sends USSD push to phone)
export async function POST(req: NextRequest) {
  try {
    return await handleDeposit(req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[deposit] unhandled:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function handleDeposit(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

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
  // Marz requires UUID v4 references
  const reference = crypto.randomUUID()

  let marzUuid: string
  try {
    const result = await collectMoney({ amount, phone_number, reference, description: 'Sabula 256 deposit' })
    marzUuid = result.data.transaction.uuid
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Payment request failed' }, { status: 502 })
  }

  await admin.from('transactions').insert({
    user_id: user.id,
    type: 'deposit',
    amount,
    status: 'pending',
    reference,
    metadata: { phone: phone_number, marz_uuid: marzUuid },
  })

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
  if (txn.status === 'completed') return NextResponse.json({ status: 'completed', balance: txn.balance_after })
  if (txn.status === 'failed')    return NextResponse.json({ status: 'failed' })

  const marzUuid = txn.metadata?.marz_uuid
  if (!marzUuid) return NextResponse.json({ status: 'pending' })

  try {
    const result = await getCollectionStatus(marzUuid)
    const txStatus = result.data?.transaction?.status

    if (txStatus === 'successful') {
      const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
      const newBalance = Number(wallet?.balance ?? 0) + Number(txn.amount)
      await Promise.all([
        admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user.id),
        admin.from('transactions').update({ status: 'completed', balance_after: newBalance }).eq('id', txn.id),
      ])
      return NextResponse.json({ status: 'completed', balance: newBalance })
    }
    if (txStatus === 'failed' || txStatus === 'cancelled') {
      await admin.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
      return NextResponse.json({ status: 'failed' })
    }
  } catch { /* keep polling */ }

  return NextResponse.json({ status: 'pending' })
}
