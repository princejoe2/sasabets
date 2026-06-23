import { NextRequest, NextResponse } from 'next/server'

const e = (k: string) => (process.env[k] ?? '').replace(/^﻿/, '').trim()
const RESEND_API_KEY = e('RESEND_API_KEY')
const HOOK_SECRET    = e('SEND_EMAIL_HOOK_SECRET')
const SITE_URL       = e('NEXT_PUBLIC_SITE_URL') || 'https://sabula256.com'
const FROM           = 'Sabula 256 <support@sabula256.com>'

interface HookPayload {
  user: { email: string }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
  }
}

function verifyUrl(tokenHash: string, type: string) {
  const url = new URL(`${SITE_URL}/auth/verify`)
  url.searchParams.set('token', tokenHash)
  url.searchParams.set('type', type)
  // GoTrue sends site_url as email_data.redirect_to (not the client's emailRedirectTo),
  // so we hardcode the auth callback here to ensure PKCE code exchange completes.
  url.searchParams.set('redirect_to', `${SITE_URL}/auth/callback?next=/markets`)
  return url.toString()
}

async function send(to: string, subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!resp.ok) throw new Error(await resp.text())
}

const btn = (href: string, label: string, color = '#16a34a') =>
  `<p style="text-align:center;margin:32px 0"><a href="${href}" style="background:${color};color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">${label}</a></p>`

export async function POST(req: NextRequest) {
  const urlSecret = req.nextUrl.searchParams.get('secret')
  if (!HOOK_SECRET || urlSecret !== HOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: HookPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { user, email_data } = payload
  const { token, token_hash, email_action_type } = email_data
  const to = user.email

  try {
    switch (email_action_type) {
      case 'signup': {
        const url = verifyUrl(token_hash, 'signup')
        await send(
          to,
          'Confirm your Sabula 256 account',
          `<h2>Welcome to Sabula 256!</h2>
           <p>Click below to confirm your email and activate your account.</p>
           ${btn(url, 'Confirm my account')}
           <p style="text-align:center;color:#374151;font-size:14px;margin:24px 0 4px">Or enter this code on the confirmation page:</p>
           <p style="font-size:40px;font-weight:bold;letter-spacing:12px;text-align:center;margin:8px 0 24px;color:#111827">${token}</p>
           <p style="color:#6b7280;font-size:13px">This link and code expire in 1 hour. If you did not sign up, you can ignore this email.</p>`
        )
        break
      }

      case 'recovery': {
        const resetUrl = new URL(`${SITE_URL}/auth/verify`)
        resetUrl.searchParams.set('token', token_hash)
        resetUrl.searchParams.set('type', 'recovery')
        resetUrl.searchParams.set('redirect_to', `${SITE_URL}/auth/reset-password`)
        await send(
          to,
          'Reset your Sabula 256 password',
          `<h2>Reset your password</h2>
           <p>We received a request to reset your password. Click below to choose a new one.</p>
           ${btn(resetUrl.toString(), 'Reset password', '#2563eb')}
           <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`
        )
        break
      }

      case 'invite': {
        const url = verifyUrl(token_hash, 'invite')
        await send(
          to,
          "You've been invited to Sabula 256",
          `<h2>You've been invited</h2>
           <p>You've been invited to create a Sabula 256 account. Click below to accept.</p>
           ${btn(url, 'Accept invitation')}`
        )
        break
      }

      case 'magic_link': {
        const url = verifyUrl(token_hash, 'magiclink')
        await send(
          to,
          'Your Sabula 256 sign-in link',
          `<h2>Your sign-in link</h2>
           <p>Click below to sign in. This link expires in 1 hour and can only be used once.</p>
           ${btn(url, 'Sign in', '#2563eb')}`
        )
        break
      }

      case 'reauthentication': {
        await send(
          to,
          `${token} is your Sabula 256 verification code`,
          `<h2>Your verification code</h2>
           <p>Use the code below to verify your identity. It expires in 10 minutes.</p>
           <p style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;margin:32px 0">${token}</p>
           <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`
        )
        break
      }

      case 'email_change':
      case 'email_change_current':
      case 'email_change_new': {
        const url = verifyUrl(token_hash, 'email_change')
        await send(
          to,
          'Confirm your email change on Sabula 256',
          `<h2>Confirm email change</h2>
           <p>Click below to confirm the email address change for your Sabula 256 account.</p>
           ${btn(url, 'Confirm email change', '#2563eb')}
           <p style="color:#6b7280;font-size:13px">If you didn't request this, contact support immediately.</p>`
        )
        break
      }

      default:
        console.warn(`[send-email hook] Unknown action type: ${email_action_type}`)
    }
  } catch (err) {
    console.error('[send-email hook] Failed to send:', email_action_type, err)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }

  return NextResponse.json({ message: 'ok' })
}
