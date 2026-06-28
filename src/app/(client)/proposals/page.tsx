import { createClient } from '@/lib/supabase/server'
import ProposalsPageClient from './ProposalsPageClient'

export const revalidate = 60

export default async function ProposalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, description, category, option_a, option_b, status, market_id, vote_count, created_at, user_id')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: userVotes } = user
    ? await supabase.from('proposal_votes').select('proposal_id').eq('user_id', user.id)
    : { data: [] }

  const votedIds = (userVotes ?? []).map(v => v.proposal_id)

  const all = proposals ?? []
  const launched = all.filter(p => p.status === 'approved' && p.market_id).length

  return (
    <ProposalsPageClient
      proposals={all}
      votedIds={votedIds}
      isLoggedIn={!!user}
      stats={{ launched, totalCommunity: all.length }}
    />
  )
}
