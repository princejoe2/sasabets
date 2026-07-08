import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID
  const token      = process.env.ULTRAMSG_TOKEN

  if (!instanceId || !token) {
    return NextResponse.json({ error: 'Missing env vars', instanceId: !!instanceId, token: !!token })
  }

  const to = '+256783033457'
  const body = 'Test from Vercel – WhatsApp approval flow working?'
  const params = new URLSearchParams({ token, to, body })
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`

  try {
    const r = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })
    const text = await r.text()
    return NextResponse.json({ ok: r.ok, status: r.status, response: text, url, instanceId, tokenPrefix: token.slice(0, 4) })
  } catch (err) {
    return NextResponse.json({ error: String(err), url, instanceId, tokenPrefix: token.slice(0, 4) })
  }
}
