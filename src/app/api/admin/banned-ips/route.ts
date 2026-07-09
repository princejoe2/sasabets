import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

// GET  /api/admin/banned-ips — list all banned IPs
export async function GET() {
  const g = await guardAdmin(['moderator'])
  if ('error' in g) return g.error

  const { data, error } = await g.admin
    .from('banned_ips')
    .select('ip, reason, banned_at, expires_at, banned_by')
    .order('banned_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/banned-ips — ban an IP
export async function POST(req: NextRequest) {
  const g = await guardAdmin(['moderator'])
  if ('error' in g) return g.error

  const body = await req.json()
  const ip: string = (body.ip ?? '').trim()
  const reason: string = (body.reason ?? '').slice(0, 500).trim()
  const expires_at: string | null = body.expires_at ?? null

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
  const ipv6 = /^[0-9a-f:]{2,39}$/i.test(ip)
  if (!ip || (!ipv4 && !ipv6)) {
    return NextResponse.json({ error: 'Invalid IP address' }, { status: 400 })
  }

  const { error } = await g.admin.from('banned_ips').upsert(
    { ip, reason, banned_by: g.user.id, banned_at: new Date().toISOString(), expires_at },
    { onConflict: 'ip' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/banned-ips — unban an IP  (body: { ip })
export async function DELETE(req: NextRequest) {
  const g = await guardAdmin(['moderator'])
  if ('error' in g) return g.error

  const body = await req.json()
  const ip: string = (body.ip ?? '').trim()
  if (!ip) return NextResponse.json({ error: 'ip required' }, { status: 400 })

  const { error } = await g.admin.from('banned_ips').delete().eq('ip', ip)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
