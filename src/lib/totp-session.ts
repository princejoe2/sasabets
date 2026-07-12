import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'sb_admin_2fa'
const TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

function secret() {
  // Dedicated signing key — falls back to service role key only if not set
  return process.env.TOTP_SIGNING_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
}

function sign(userId: string, ts: number): string {
  return createHmac('sha256', secret()).update(`${userId}:${ts}`).digest('hex')
}

export function buildTotpCookie(userId: string): { name: string; value: string; options: object } {
  const ts = Date.now()
  const sig = sign(userId, ts)
  const value = Buffer.from(`${userId}:${ts}:${sig}`).toString('base64url')
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: TTL_MS / 1000,
      path: '/',
    },
  }
}

export function verifyTotpCookie(cookieValue: string | undefined, userId: string): boolean {
  if (!cookieValue) return false
  try {
    const decoded = Buffer.from(cookieValue, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [uid, tsStr, sig] = parts
    const ts = Number(tsStr)
    if (uid !== userId) return false
    if (Date.now() - ts > TTL_MS) return false
    const expected = Buffer.from(sign(userId, ts), 'hex')
    const provided = Buffer.from(sig, 'hex')
    return provided.length === expected.length && timingSafeEqual(expected, provided)
  } catch {
    return false
  }
}

export { COOKIE_NAME }
