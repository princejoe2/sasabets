import { NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { guardAdmin } from '@/lib/admin-guard'
import { sendEmail, btn } from '@/lib/email'
import type { StaffRole } from '@/lib/admin-roles'

const ROLE_LABELS: Record<StaffRole, string> = {
  moderator: 'Moderator',
  settler:   'Settler',
  support:   'Support',
  analyst:   'Analyst',
  content:   'Content Manager',
}

function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin()
  if ('error' in g) return g.error
  if (!g.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: profile } = await g.admin
    .from('profiles')
    .select('full_name, staff_role, totp_secret')
    .eq('id', userId)
    .single()

  if (!profile?.staff_role)
    return NextResponse.json({ error: 'User is not a staff member' }, { status: 400 })

  const { data: { user: authUser } } = await g.admin.auth.admin.getUserById(userId)
  const email = authUser?.email
  if (!email) return NextResponse.json({ error: 'User email not found' }, { status: 400 })

  // Generate a new password and update auth
  const password = generatePassword()
  await g.admin.auth.admin.updateUserById(userId, { password })

  // Keep existing TOTP secret; regenerate if missing
  let totpSecret = profile.totp_secret
  if (!totpSecret) {
    totpSecret = authenticator.generateSecret()
    await g.admin.from('profiles').update({ totp_secret: totpSecret, totp_enabled: true }).eq('id', userId)
  }

  const otpUri     = authenticator.keyuri(email, 'Sabula 256 Admin', totpSecret)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpUri)}&margin=10`

  const fullName  = profile.full_name ?? email
  const roleLabel = ROLE_LABELS[profile.staff_role as StaffRole] ?? profile.staff_role
  const adminUrl  = 'https://sabula256.com/admin'

  await sendEmail(
    email,
    `Your Sabula 256 Admin Credentials (Resent) — ${roleLabel}`,
    `
    <div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;text-align:center">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c4b5fd">Sabula 256</p>
        <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff">Admin Credentials</h1>
        <p style="margin:10px 0 0;font-size:14px;color:#a5b4fc">Your credentials have been reset</p>
      </div>

      <div style="padding:32px 28px">
        <p style="color:#94a3b8;margin:0 0 20px">Hi ${fullName}, your Sabula 256 credentials have been resent. Your previous password has been replaced.</p>

        <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:0 0 20px">
          <p style="margin:0 0 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700">Login Credentials</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="color:#64748b;font-size:13px;padding:4px 0;width:90px">Email</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;font-family:monospace">${email}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:13px;padding:4px 0">Password</td>
              <td style="color:#fbbf24;font-size:15px;font-weight:700;font-family:monospace;letter-spacing:1px">${password}</td>
            </tr>
          </table>
        </div>

        <div style="background:#064e3b20;border:1px solid #065f46;border-radius:12px;padding:20px;margin:0 0 20px">
          <p style="margin:0 0 8px;font-size:12px;color:#6ee7b7;text-transform:uppercase;letter-spacing:1px;font-weight:700">Two-Factor Authentication</p>
          <p style="margin:0 0 12px;font-size:13px;color:#94a3b8">Your 2FA secret is unchanged. If you haven't set it up yet, scan the QR code below:</p>
          <p style="margin:0 0 8px;font-size:12px;color:#6ee7b7;font-weight:700">Option 1 — Scan QR code:</p>
          <div style="text-align:center;margin:0 0 12px">
            <img src="${qrImageUrl}" alt="2FA QR Code" style="width:180px;height:180px;border-radius:8px;background:#fff;padding:8px" />
          </div>
          <p style="margin:0 0 4px;font-size:12px;color:#6ee7b7;font-weight:700">Option 2 — Enter secret manually:</p>
          <p style="margin:0;font-family:monospace;font-size:13px;color:#34d399;word-break:break-all;background:#0a2017;padding:8px 12px;border-radius:6px">${totpSecret}</p>
        </div>

        ${btn(adminUrl, 'Go to Admin Panel', '#6d28d9')}

        <p style="margin:24px 0 0;font-size:12px;color:#334155;text-align:center">
          Keep your credentials secure and do not share them.
        </p>
      </div>
    </div>
    `
  )

  return NextResponse.json({ success: true, email })
}
