import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateAccessToken, hashAccessToken } from '@/lib/market-token'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { marketId, isPrivate } = await req.json()
  if (!marketId) return NextResponse.json({ error: 'marketId required' }, { status: 400 })

  const { data: market } = await admin
    .from('markets')
    .select('id, created_by, metadata, status')
    .eq('id', marketId)
    .single()

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.created_by !== user.id) return NextResponse.json({ error: 'Not your market' }, { status: 403 })
  if (market.status === 'settled') return NextResponse.json({ error: 'Cannot change visibility of a settled market' }, { status: 400 })

  const meta = (market.metadata ?? {}) as Record<string, unknown>
  let accessToken: string | null = null
  let updatedMeta: Record<string, unknown>

  if (isPrivate) {
    // Only the hash is stored (metadata is world-readable via PostgREST), so a
    // fresh token is issued every time the market is made private. The raw token
    // is returned once in this response and never persisted.
    accessToken = generateAccessToken()
    const { access_token: _legacy, ...rest } = meta
    updatedMeta = { ...rest, private: true, access_token_hash: hashAccessToken(accessToken) }
  } else {
    // Strip private flag and any token material
    const { private: _p, access_token: _t, access_token_hash: _h, ...rest } = meta
    updatedMeta = rest
  }

  const { error } = await admin
    .from('markets')
    .update({ metadata: updatedMeta })
    .eq('id', marketId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true, isPrivate, accessToken })
}
