import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim()

// Proxy route that keeps email link domains on sabula256.com.
// Spam filters penalise emails where the link domain differs from the sending domain.
// This route forwards to the real Supabase /auth/v1/verify endpoint.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token      = searchParams.get('token')      ?? ''
  const type       = searchParams.get('type')       ?? ''
  const redirectTo = searchParams.get('redirect_to') ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sabula256.com'}/markets`

  const supabaseVerify = new URL(`${SUPABASE_URL}/auth/v1/verify`)
  supabaseVerify.searchParams.set('token', token)
  supabaseVerify.searchParams.set('type', type)
  supabaseVerify.searchParams.set('redirect_to', redirectTo)

  return NextResponse.redirect(supabaseVerify.toString())
}
