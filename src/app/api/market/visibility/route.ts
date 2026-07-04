import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'

function generateAccessToken(): string {
  return randomBytes(12).toString('base64url').slice(0, 16)
}

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
    // Reuse existing token if already private, generate new one otherwise
    accessToken = (meta.access_token as string | undefined) ?? generateAccessToken()
    updatedMeta = { ...meta, private: true, access_token: accessToken }
  } else {
    // Strip private flag and token
    const { private: _p, access_token: _t, ...rest } = meta
    updatedMeta = rest
  }

  const { error } = await admin
    .from('markets')
    .update({ metadata: updatedMeta })
    .eq('id', marketId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true, isPrivate, accessToken })
}
