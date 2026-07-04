import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const leagueId = req.nextUrl.searchParams.get('league')
  if (!leagueId) return NextResponse.json({ error: 'Missing league' }, { status: 400 })

  const apiKey = process.env.SPORTSDB_API_KEY ?? '3'
  const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnextleague.php?id=${leagueId}`

  try {
    const res  = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    const events = (data.events ?? []).slice(0, 20).map((e: Record<string, string>) => ({
      id:      e.idEvent,
      league:  e.strLeague,
      home:    e.strHomeTeam,
      away:    e.strAwayTeam,
      date:    e.strTimestamp ?? e.dateEvent,
      country: e.strCountry,
    }))
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'TheSportsDB fetch failed' }, { status: 502 })
  }
}
