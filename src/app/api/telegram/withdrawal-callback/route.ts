import { NextResponse } from 'next/server'

// Withdrawal approval is now automatic — this webhook endpoint is no longer used.
export async function POST() {
  return NextResponse.json({ ok: false, error: 'Withdrawal approval is now automatic' }, { status: 410 })
}
