import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type MarketDraft = {
  title: string
  description: string
  closes_at: string
  options: [string, string]
  sport_event_id: string
  home_team: string
  away_team: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { markets }: { markets: MarketDraft[] } = await req.json()
  if (!markets?.length) return NextResponse.json({ error: 'No markets provided' }, { status: 400 })

  let created = 0
  for (const m of markets) {
    const options = m.options.map((label, i) => ({
      id:         `opt-${i}`,
      label,
      total_pool: 0,
    }))

    const { error } = await admin.from('markets').insert({
      title:          m.title,
      description:    m.description || null,
      closes_at:      m.closes_at,
      status:         'open',
      options,
      total_pool:     0,
      rake_pct:       0.08,
      metadata: {
        sport_event_id: m.sport_event_id,
        home_team:      m.home_team,
        away_team:      m.away_team,
        auto_created:   true,
      },
    })

    if (!error) created++
    else console.error('Failed to create market:', m.title, error.message)
  }

  return NextResponse.json({ created })
}
