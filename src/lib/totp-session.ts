import { createHmac, timingSafeEqual } from 'crypto'

export const COOKIE_NAME = 'sb_admin_2fa'
const TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

function secret() {
  return process.env.TOTP_SIGNING_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
}

function sign(userId: string, ts: number, sessionId: string): string {
  return createHmac('sha256', secret()).update(`${userId}:${ts}:${sessionId}`).digest('hex')
}

// Cookie format: base64url(userId:timestamp:sessionId:sig)
// sessionId is a UUID stored in profiles.admin_session_id — used to enforce
// single-device admin sessions. Changing it in the DB kicks all other cookies.
export function buildTotpCookie(userId: string, sessionId: string): { name: string; value: string; options: object } {
  const ts = Date.now()
  const sig = sign(userId, ts, sessionId)
  const value = Buffer.from(`${userId}:${ts}:${sessionId}:${sig}`).toString('base64url')
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

export function verifyTotpCookie(
  cookieValue: string | undefined,
  userId: string,
): { valid: boolean; sessionId: string | null } {
  if (!cookieValue) return { valid: false, sessionId: null }
  try {
    const decoded = Buffer.from(cookieValue, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 4) return { valid: false, sessionId: null }
    const [uid, tsStr, sessionId, sig] = parts
    const ts = Number(tsStr)
    if (uid !== userId) return { valid: false, sessionId: null }
    if (Date.now() - ts > TTL_MS) return { valid: false, sessionId: null }
    const expected = Buffer.from(sign(userId, ts, sessionId), 'hex')
    const provided = Buffer.from(sig, 'hex')
    if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
      return { valid: false, sessionId: null }
    }
    return { valid: true, sessionId }
  } catch {
    return { valid: false, sessionId: null }
  }
}
