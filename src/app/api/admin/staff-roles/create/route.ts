import { NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { guardAdmin } from '@/lib/admin-guard'
import { sendEmail, btn } from '@/lib/email'
import type { StaffRole } from '@/lib/admin-roles'

const VALID_ROLES: StaffRole[] = ['moderator', 'settler', 'support', 'analyst', 'content']
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

  const body = await req.json()
  const email: string    = (body.email    ?? '').trim().toLowerCase()
  const fullName: string = (body.fullName ?? '').trim()
  const role: string     = (body.role     ?? '').trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  if (!fullName)
    return NextResponse.json({ error: 'Full name required' }, { status: 400 })
  if (!VALID_ROLES.includes(role as StaffRole))
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })

  const password = generatePassword()

  // Create the auth user
  const { data: authData, error: createErr } = await g.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !authData?.user)
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 400 })

  const userId = authData.user.id

  // Generate TOTP secret and enable 2FA immediately
  const totpSecret  = authenticator.generateSecret()
  const otpUri      = authenticator.keyuri(email, 'Sabula 256 Admin', totpSecret)
  const qrImageUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpUri)}&margin=10`

  // Insert profile with role + 2FA already enabled
  await g.admin.from('profiles').upsert({
    id:           userId,
    full_name:    fullName,
    staff_role:   role,
    totp_secret:  totpSecret,
    totp_enabled: true,
    is_admin:     false,
  }, { onConflict: 'id' })

  // Send welcome email with credentials + QR code
  const adminUrl = 'https://sabula256.com/admin'
  const roleLabel = ROLE_LABELS[role as StaffRole]

  await sendEmail(
    email,
    `Your Sabula 256 Admin Access — ${roleLabel}`,
    `
    <div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;text-align:center">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c4b5fd">Sabula 256</p>
        <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff">Welcome to the Admin Panel</h1>
        <p style="margin:10px 0 0;font-size:14px;color:#a5b4fc">Your staff account is ready</p>
      </div>

      <div style="padding:32px 28px">
        <p style="color:#94a3b8;margin:0 0 20px">Hi ${fullName}, your Sabula 256 staff account has been created with the <strong style="color:#fff">${roleLabel}</strong> role.</p>

        <!-- Credentials -->
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

        <!-- 2FA -->
        <div style="background:#064e3b20;border:1px solid #065f46;border-radius:12px;padding:20px;margin:0 0 20px">
          <p style="margin:0 0 8px;font-size:12px;color:#6ee7b7;text-transform:uppercase;letter-spacing:1px;font-weight:700">Two-Factor Authentication (Required)</p>
          <p style="margin:0 0 12px;font-size:13px;color:#94a3b8">Your account requires 2FA. Before logging in, add this to Google Authenticator or Authy:</p>
          <p style="margin:0 0 8px;font-size:12px;color:#6ee7b7;font-weight:700">Option 1 — Scan QR code:</p>
          <div style="text-align:center;margin:0 0 12px">
            <img src="${qrImageUrl}" alt="2FA QR Code" style="width:180px;height:180px;border-radius:8px;background:#fff;padding:8px" />
          </div>
          <p style="margin:0 0 4px;font-size:12px;color:#6ee7b7;font-weight:700">Option 2 — Enter secret manually:</p>
          <p style="margin:0;font-family:monospace;font-size:13px;color:#34d399;word-break:break-all;background:#0a2017;padding:8px 12px;border-radius:6px">${totpSecret}</p>
        </div>

        <div style="background:#1e1b4b20;border:1px solid #312e81;border-radius:10px;padding:14px 16px;margin:0 0 24px">
          <p style="margin:0;font-size:13px;color:#a5b4fc">
            <strong>Steps:</strong> (1) Add the QR code to your authenticator app &rarr; (2) Go to the admin panel &rarr; (3) Sign in with your email &amp; password &rarr; (4) Enter the 2FA code when prompted.
          </p>
        </div>

        ${btn(adminUrl, 'Go to Admin Panel', '#6d28d9')}

        <p style="margin:24px 0 0;font-size:12px;color:#334155;text-align:center">
          Change your password after first login. Keep your credentials secure.
        </p>
      </div>
    </div>
    `
  )

  return NextResponse.json({ success: true, userId, email, role, fullName })
}
