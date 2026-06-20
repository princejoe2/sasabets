import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BetPanel from './BetPanel'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data: m } = await supabase
    .from('markets')
    .select('title, description, options, total_pool')
    .eq('id', params.id)
    .single()
  if (!m) return {}
  const opts = m.options as Array<{ label: string; total_pool: number }>
  const desc = m.description
    ?? (opts.length >= 2 ? `${opts[0].label} vs ${opts[1].label} · UGX ${Number(m.total_pool).toLocaleString()} pool` : '')
  return {
    title: `${m.title} — Sabula 256`,
    description: desc,
    openGraph: { title: m.title, description: desc, siteName: 'Sabula 256', type: 'website' },
    twitter:    { card: 'summary', title: m.title, description: desc },
  }
}

type Option = { id: string; label: string; total_pool: number }
type Market = {
  id: string
  title: string
  description: string | null
  total_pool: number
  options: Option[]
  closes_at: string | null
  status: string
  rake_pct: number
  winning_option_id: string | null
  metadata: Record<string, unknown> | null
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { pick?: string }
}) {
  const supabase = createClient()

  const { data: market } = await supabase
    .from('markets')
    .select('id, title, description, total_pool, options, closes_at, status, rake_pct, winning_option_id, metadata')
    .eq('id', params.id)
    .single()

  if (!market) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  let balance: number | null = null
  let userBet: { option_id: string; amount: number } | null = null

  if (user) {
    const [{ data: wallet }, { data: bets }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      supabase.from('bets').select('option_id, amount').eq('user_id', user.id).eq('market_id', params.id).limit(1),
    ])
    balance = wallet?.balance ?? null
    userBet = bets?.[0] ?? null
  }

  return (
    <BetPanel
      market={market as Market}
      initialBalance={balance}
      initialPick={searchParams.pick ?? null}
      isLoggedIn={!!user}
      userBet={userBet}
    />
  )
}
