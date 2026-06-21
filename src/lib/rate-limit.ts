import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Sliding window rate limiter backed by the `rate_limit_log` table.
 * Use for IP-based limits on unauthenticated endpoints.
 * For authenticated endpoints, prefer counting existing rows in transactions/bets.
 *
 * Required table (run once in Supabase SQL editor):
 *   CREATE TABLE rate_limit_log (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     key text NOT NULL,
 *     created_at timestamptz DEFAULT now() NOT NULL
 *   );
 *   CREATE INDEX rate_limit_log_key_created ON rate_limit_log (key, created_at);
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count } = await admin
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', since)

  if ((count ?? 0) >= limit) return { allowed: false }

  await admin.from('rate_limit_log').insert({ key })
  return { allowed: true }
}
