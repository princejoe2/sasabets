import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('pool_depth_snapshots')
    .select('snapshot_at, total_pool')
    .eq('market_id', (await params).id)
    .order('snapshot_at', { ascending: true })
    .limit(48)

  return NextResponse.json({ snapshots: data ?? [] })
}
