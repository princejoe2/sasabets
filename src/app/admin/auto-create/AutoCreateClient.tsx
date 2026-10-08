'use client'
import { useState } from 'react'

type Event = {
  id: string
  league: string
  home: string
  away: string
  date: string
  country: string
}

type Draft = {
  event: Event
  title: string
  description: string
  closes_at: string
  options: string[]
  editing?: boolean
}

const LEAGUES = [
  { id: '148', name: 'Uganda Premier League' },
  { id: '39',  name: 'Premier League (England)' },
  { id: '140', name: 'La Liga (Spain)' },
  { id: '78',  name: 'Bundesliga (Germany)' },
  { id: '135', name: 'Serie A (Italy)' },
  { id: '61',  name: 'Ligue 1 (France)' },
  { id: '2',   name: 'UEFA Champions League' },
]

function buildOptionsJsonb(labels: string[]) {
  const isBinary = labels.length === 2 &&
    labels.every(l => ['yes', 'no'].includes(l.toLowerCase().trim()))
  if (isBinary) {
    return [
      { id: 'yes', label: 'Yes', total_pool: 0 },
      { id: 'no',  label: 'No',  total_pool: 0 },
    ]
  }
  return labels.flatMap(label => {
    const slug = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    return [
      { id: `${slug}_yes`, label: `${label} YES`, total_pool: 0 },
      { id: `${slug}_no`,  label: `${label} NO`,  total_pool: 0 },
    ]
  })
}

export default function AutoCreateClient() {
  const [leagueId,  setLeagueId]  = useState('')
  const [events,    setEvents]    = useState<Event[]>([])
  const [drafts,    setDrafts]    = useState<Draft[]>([])
  const [loading,   setLoading]   = useState(false)
  const [creating,  setCreating]  = useState(false)
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  async function fetchEvents() {
    if (!leagueId) return
    setLoading(true); setMsg(null); setEvents([]); setDrafts([])
    const res = await fetch(`/api/admin/sports-events?league=${leagueId}`)
    if (res.ok) {
      const data: Event[] = await res.json()
      setEvents(data)
      if (data.length === 0) setMsg({ text: 'No upcoming events found for this league.', ok: false })
    } else {
      setMsg({ text: 'Failed to fetch events. Check TheSportsDB API key in env.', ok: false })
    }
    setLoading(false)
  }

  function addToDraft(ev: Event) {
    const closes = new Date(ev.date)
    closes.setMinutes(closes.getMinutes() - 15)
    setDrafts(d => [...d, {
      event: ev,
      title: `${ev.home} vs ${ev.away}`,
      description: `${ev.league} — ${new Date(ev.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'long' })}`,
      closes_at: closes.toISOString().slice(0, 16),
      options: [ev.home, ev.away],
    }])
  }

  function removeDraft(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i))
  }

  function updateDraft(i: number, field: keyof Draft, value: string) {
    setDrafts(d => d.map((dr, idx) => idx !== i ? dr : { ...dr, [field]: value }))
  }

  function updateOption(draftIdx: number, optIdx: number, value: string) {
    setDrafts(ds => ds.map((x, xi) =>
      xi === draftIdx
        ? { ...x, options: x.options.map((o, oi) => oi === optIdx ? value : o) }
        : x
    ))
  }

  async function createAll() {
    if (drafts.length === 0) return
    setCreating(true); setMsg(null)
    const res = await fetch('/api/admin/auto-create-markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markets: drafts.map(d => ({
        title: d.title,
        description: d.description,
        closes_at: new Date(d.closes_at).toISOString(),
        options: buildOptionsJsonb(d.options),
        sport_event_id: d.event.id,
        home_team: d.event.home,
        away_team: d.event.away,
      })) }),
    })
    if (res.ok) {
      const { created } = await res.json()
      setMsg({ text: `Created ${created} market${created !== 1 ? 's' : ''} successfully.`, ok: true })
      setDrafts([])
    } else {
      const e = await res.json()
      setMsg({ text: e.error ?? 'Failed to create markets.', ok: false })
    }
    setCreating(false)
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Auto-Create Markets</h1>
        <p className="mt-1 text-sm text-slate-500">Fetch upcoming football fixtures and publish prediction markets in one click.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Step 1: Pick league */}
      <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
        <h2 className="font-bold text-slate-200">1. Choose a League</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {LEAGUES.map(l => (
            <button key={l.id} onClick={() => setLeagueId(l.id)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold text-left transition-all ${leagueId === l.id ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'}`}>
              {l.name}
            </button>
          ))}
        </div>
        <button onClick={fetchEvents} disabled={!leagueId || loading}
          className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-40 transition-colors">
          {loading ? 'Fetching…' : 'Fetch upcoming fixtures'}
        </button>
      </div>

      {/* Step 2: Pick events */}
      {events.length > 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <h2 className="font-bold text-slate-200">2. Select Fixtures</h2>
          <div className="space-y-2">
            {events.map(ev => {
              const already = drafts.some(d => d.event.id === ev.id)
              return (
                <div key={ev.id} className="flex items-center justify-between rounded-xl border border-[#1e1e2e] px-4 py-3 gap-4">
                  <div>
                    <p className="font-semibold text-slate-200">{ev.home} vs {ev.away}</p>
                    <p className="text-xs text-slate-600">{ev.league} · {new Date(ev.date).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => already ? removeDraft(drafts.findIndex(d => d.event.id === ev.id)) : addToDraft(ev)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${already ? 'bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/40' : 'bg-violet-600 text-white hover:bg-violet-500'}`}>
                    {already ? 'Remove' : '+ Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Review & edit drafts */}
      {drafts.length > 0 && (
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <h2 className="font-bold text-slate-200">3. Review & Publish ({drafts.length} market{drafts.length !== 1 ? 's' : ''})</h2>
          <div className="space-y-4">
            {drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-[#2a2a3e] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <input value={d.title} onChange={e => updateDraft(i, 'title', e.target.value)}
                    className="flex-1 rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-2 text-sm text-white outline-none focus:border-violet-600 transition-colors font-semibold" />
                  <button onClick={() => removeDraft(i)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2">✕</button>
                </div>
                <input value={d.description} onChange={e => updateDraft(i, 'description', e.target.value)}
                  className="w-full rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-2 text-sm text-slate-400 outline-none focus:border-violet-600 transition-colors" />

                {/* Dynamic outcome list */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">Outcomes ({d.options.length})</p>
                  {d.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-1">
                      <input
                        value={opt}
                        onChange={e => updateOption(i, oi, e.target.value)}
                        className="flex-1 rounded-lg border border-[#1e1e2e] bg-[#111118] px-2 py-1.5 text-xs text-white outline-none focus:border-violet-600"
                      />
                      {d.options.length > 2 && (
                        <button
                          onClick={() => setDrafts(ds => ds.map((x, xi) =>
                            xi === i ? { ...x, options: x.options.filter((_, fi) => fi !== oi) } : x
                          ))}
                          className="text-red-400 hover:text-red-300 text-xs px-2 rounded"
                        >✕</button>
                      )}
                    </div>
                  ))}
                  {d.options.length < 16 && (
                    <button
                      onClick={() => setDrafts(ds => ds.map((x, xi) =>
                        xi === i ? { ...x, options: [...x.options, ''] } : x
                      ))}
                      className="text-xs text-slate-500 hover:text-slate-300 mt-1"
                    >+ Add outcome</button>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">Closes at</p>
                  <input type="datetime-local" value={d.closes_at} onChange={e => updateDraft(i, 'closes_at', e.target.value)}
                    className="rounded-lg border border-[#1e1e2e] bg-[#111118] px-3 py-2 text-sm text-slate-400 outline-none focus:border-violet-600" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={createAll} disabled={creating}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {creating ? 'Creating…' : `Publish ${drafts.length} market${drafts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
