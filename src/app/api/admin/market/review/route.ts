import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { cancelAndRefundMarket } from '@/lib/refund-market'
import { pingIndexNow } from '@/lib/indexnow'

function page(title: string, message: string, success: boolean) {
  const accent = success ? '#10b981' : '#ef4444'
  const emoji  = success ? '✅' : '❌'
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} – Sabula 256</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#08080e;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#0d0d18;border:1px solid #1a1a28;border-radius:20px;padding:48px 40px;max-width:420px;width:100%;text-align:center}
    .badge{display:inline-block;color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;margin-bottom:24px}
    .emoji{font-size:52px;margin-bottom:20px;display:block}
    .ttl{color:#f1f5f9;font-size:20px;font-weight:700;margin-bottom:10px}
    .msg{color:#64748b;font-size:14px;line-height:1.6}
    .close{margin-top:32px;color:#334155;font-size:12px}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Sabula 256 Admin</span>
    <span class="emoji">${emoji}</span>
    <p class="ttl">${title}</p>
    <p class="msg">${message}</p>
    <p class="close">You can close this tab.</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')     ?? ''
  const action = searchParams.get('action') ?? ''
  const exp    = searchParams.get('exp')    ?? ''
  const sig    = searchParams.get('sig')    ?? ''

  if (!id || !['approve', 'deny'].includes(action) || !exp || !sig) {
    return page('Invalid link', 'This approval link is missing required parameters.', false)
  }

  const secret = process.env.ADMIN_REVIEW_SECRET
  if (!secret) {
    return page('Configuration error', 'ADMIN_REVIEW_SECRET is not set on the server.', false)
  }

  if (Date.now() / 1000 > Number(exp)) {
    return page('Link expired', 'This approval link has expired. Check the admin panel to review the market manually.', false)
  }

  const expected = createHmac('sha256', secret).update(`${id}:${action}:${exp}`).digest('hex')
  if (sig !== expected) {
    return page('Invalid link', 'This link has been tampered with or is invalid.', false)
  }

  const admin = createAdminClient()

  if (action === 'approve') {
    const { data: market, error } = await admin
      .from('markets')
      .update({ status: 'open' })
      .eq('id', id)
      .eq('status', 'pending_approval')
      .select('id, title, created_by, metadata')
      .single()

    if (error || !market) {
      return page('Already actioned', 'This market has already been approved or denied.', false)
    }

    const meta = (market.metadata ?? {}) as Record<string, unknown>
    if (meta.private !== true) {
      pingIndexNow(`https://sabula256.com/markets/${id}`).catch(() => {})
    }

    return page('Market approved!', `"${market.title}" is now live on Sabula 256.`, true)
  }

  // action === 'deny'
  const { data: marketCheck } = await admin
    .from('markets')
    .select('id, title')
    .eq('id', id)
    .eq('status', 'pending_approval')
    .single()

  if (!marketCheck) {
    return page('Already actioned', 'This market has already been approved or denied.', false)
  }

  const result = await cancelAndRefundMarket(admin, id, {
    reason:       'Admin denied via WhatsApp approval link',
    fromStatuses: ['pending_approval'],
  })

  if (!result.ok) {
    return page('Could not deny', result.error ?? 'Something went wrong. Try again from the admin panel.', false)
  }

  return page('Market denied', `"${marketCheck.title}" was rejected and the creator's stake has been refunded.`, true)
}
