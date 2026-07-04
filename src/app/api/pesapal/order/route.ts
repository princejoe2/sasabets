import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getPesapalToken, registerIPN, submitOrder } from '@/lib/pesapal'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await req.json()
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1000 || amount > 200_000) {
    return NextResponse.json({ error: 'Deposit must be a whole number between UGX 1,000 and UGX 200,000' }, { status: 400 })
  }

  // Get phone + name from profile
  const { data: profile } = await admin
    .from('profiles')
    .select('phone, full_name')
    .eq('id', user.id)
    .single()

  const phone = profile?.phone ?? (user.phone ?? '')
  const firstName = profile?.full_name?.split(' ')[0] ?? 'User'

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!
  const reference = `SB-${user.id.slice(0, 8)}-${Date.now()}`

  try {
    const token = await getPesapalToken()
    const ipnId = await registerIPN(token, `${BASE_URL}/api/pesapal/ipn`)

    const order = await submitOrder(token, {
      reference,
      amount,
      currency: 'UGX',
      description: `Sabula 256 deposit – UGX ${amount.toLocaleString()}`,
      callbackUrl: `${BASE_URL}/wallet?status=success`,
      ipnId,
      phone,
      firstName,
    })

    if (!order.redirect_url) {
      throw new Error(`Pesapal order failed: ${JSON.stringify(order)}`)
    }

    const { error: insertErr } = await admin.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      status: 'pending',
      reference,
      pesapal_tracking_id: order.order_tracking_id,
      metadata: { merchant_reference: order.merchant_reference },
    })

    if (insertErr) throw new Error(`Transaction record failed: ${insertErr.message}`)

    return NextResponse.json({ redirect_url: order.redirect_url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment initiation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
