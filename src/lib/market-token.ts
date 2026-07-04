import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// Private-market access tokens are stored ONLY as a SHA-256 hash in
// markets.metadata.access_token_hash. The markets table is world-readable
// through PostgREST (anon key), so a plaintext token in metadata would leak
// the secret link to anyone who queried the row directly.

export function generateAccessToken(): string {
  return randomBytes(12).toString('base64url').slice(0, 16)
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Verifies a presented token against market metadata. Supports the legacy
// plaintext `access_token` field so markets made private before the hash
// migration keep working.
export function verifyAccessToken(meta: Record<string, unknown>, presented: string | undefined | null): boolean {
  if (!presented) return false
  const hash = meta.access_token_hash as string | undefined
  if (hash) {
    const a = Buffer.from(hashAccessToken(presented), 'hex')
    const b = Buffer.from(hash, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  }
  const legacy = meta.access_token as string | undefined
  if (legacy) {
    const a = createHash('sha256').update(presented).digest()
    const b = createHash('sha256').update(legacy).digest()
    return timingSafeEqual(a, b)
  }
  return false
}
