import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProposalsList from './ProposalsList'

export const revalidate = 60

export default async function ProposalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, description, category, option_a, option_b, status, market_id, vote_count, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: userVotes } = user
    ? await supabase.from('proposal_votes').select('proposal_id').eq('user_id', user.id)
    : { data: [] }

  const voted = (userVotes ?? []).map(v => v.proposal_id)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-500">Community</p>
          <h1 className="text-4xl font-black text-white">Market Proposals</h1>
          <p className="mt-3 max-w-xl text-slate-400">
            Got a question the community should predict on? Submit it. If it gets enough votes, we'll turn it into a live market.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/proposals/create"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
            >
              <span className="text-base font-black">+</span> Submit a Proposal
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a3e] px-5 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:border-[#3a3a5e] transition-colors"
            >
              Live Markets →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <ProposalsList proposals={proposals ?? []} votedIds={voted} isLoggedIn={!!user} />
      </div>
    </div>
  )
}
