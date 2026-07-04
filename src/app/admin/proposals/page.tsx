import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProposalsClient from './AdminProposalsClient'

export const revalidate = 0

export default async function AdminProposalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const admin = createAdminClient()
  const { data: proposals } = await admin
    .from('proposals')
    .select('id, title, description, category, option_a, option_b, status, market_id, vote_count, closes_suggestion, created_at, user_id')
    .order('vote_count', { ascending: false })
    .limit(200)

  return <AdminProposalsClient proposals={proposals ?? []} />
}
