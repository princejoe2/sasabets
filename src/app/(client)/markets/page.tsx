import { createClient } from '@/lib/supabase/server'
import MarketsClient from '@/components/MarketsClient'

export const revalidate = 30

export default async function MarketsPage() {
  const supabase = createClient()
  const { data: markets } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, created_at, metadata')
    .order('created_at', { ascending: false })

  const all = markets ?? []
  const openCount = all.filter(m => m.status === 'open').length

  type Mkt = NonNullable<typeof markets>[0]
  function normalise(m: Mkt) {
    return {
      ...m,
      options:  m.options  as Array<{ id: string; label: string; total_pool: number }>,
      metadata: (m.metadata ?? {}) as Record<string, unknown>,
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-white">Prediction </span>
            <span className="text-violet-400">Markets</span>
          </h1>
          <p className="mt-2 text-slate-500">
            {openCount} open now · Pick your outcome · Collect your winnings
          </p>
        </div>
      </div>

      <MarketsClient markets={all.map(normalise)} openCount={openCount} />
    </div>
  )
}
