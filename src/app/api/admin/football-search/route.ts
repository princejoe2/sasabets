import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface SportsDBEvent {
  idEvent:      string
  strEvent:     string
  strHomeTeam:  string
  strAwayTeam:  string
  strLeague:    string
  strSeason:    string
  dateEvent:    string
  strTime:      string
  strStatus:    string | null
  intHomeScore: string | null
  intAwayScore: string | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) return NextResponse.json([])

  try {
    const res  = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`,
      { next: { revalidate: 60 } },
    )
    const data = await res.json()
    const events: SportsDBEvent[] = data.event ?? []

    return NextResponse.json(
      events.slice(0, 15).map(e => ({
        id:        e.idEvent,
        name:      e.strEvent,
        homeTeam:  e.strHomeTeam,
        awayTeam:  e.strAwayTeam,
        league:    e.strLeague,
        season:    e.strSeason,
        date:      e.dateEvent,
        time:      e.strTime,
        status:    e.strStatus ?? '',
        homeScore: e.intHomeScore,
        awayScore: e.intAwayScore,
      })),
    )
  } catch {
    return NextResponse.json([])
  }
}
