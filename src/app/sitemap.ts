import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

const BASE = 'https://sabula256.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  const { data: markets } = await admin
    .from('markets')
    .select('id, created_at, status')
    .in('status', ['open', 'upcoming'])
    .order('created_at', { ascending: false })

  const marketUrls = (markets ?? []).map(m => ({
    url: `${BASE}/markets/${m.id}`,
    lastModified: new Date(m.created_at),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }))

  return [
    { url: BASE,                    lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/markets`,       lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/updown`,        lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${BASE}/leaderboard`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/proposals`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/responsible-gambling`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/privacy`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    ...marketUrls,
  ]
}
