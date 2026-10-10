import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const OWNER   = 'princejoe2'
const REPO    = 'sasabets'
const TO      = 'joelukwago1@gmail.com'
const SITE    = 'https://sabula256.com'
const GH_API  = `https://api.github.com/repos/${OWNER}/${REPO}/commits`

interface GHCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  html_url: string
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function shortSha(sha: string) {
  return sha.slice(0, 7)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Africa/Kampala',
  })
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'Africa/Kampala',
  })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch commits from the past 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const until = new Date().toISOString()

  const ghRes = await fetch(
    `${GH_API}?since=${since}&until=${until}&per_page=100`,
    { headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'sabula256-weekly-cron' } },
  )

  if (!ghRes.ok) {
    console.error('[weekly-dev-summary] GitHub API error:', await ghRes.text())
    return NextResponse.json({ error: 'GitHub API failed' }, { status: 500 })
  }

  const commits: GHCommit[] = await ghRes.json()

  const weekStart = fmtDate(since)
  const weekEnd   = fmtDate(until)

  if (commits.length === 0) {
    await sendEmail(
      TO,
      `Sabula 256 · Weekly Dev Summary · ${weekStart} – ${weekEnd}`,
      `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
        <h2 style="color:#111;margin:0 0 8px">Sabula 256 — Weekly Dev Summary</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">${weekStart} – ${weekEnd}</p>
        <p style="color:#374151">No commits this week.</p>
      </div>`,
    )
    return NextResponse.json({ sent: true, commits: 0 })
  }

  // Group commits by day (EAT)
  const byDay = new Map<string, GHCommit[]>()
  for (const c of commits) {
    const day = new Date(c.commit.author.date).toLocaleDateString('en-UG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: 'Africa/Kampala',
    })
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(c)
  }

  // Build commit rows HTML
  let dayRows = ''
  for (const [, dayCmts] of byDay) {
    const dateLabel = fmtDay(dayCmts[0].commit.author.date)
    dayRows += `
      <tr>
        <td colspan="2" style="padding:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">
          ${esc(dateLabel)}
        </td>
      </tr>`
    for (const c of dayCmts) {
      const firstLine = c.commit.message.split('\n')[0]
      dayRows += `
        <tr>
          <td style="padding:7px 0;vertical-align:top;width:72px">
            <a href="${c.html_url}" style="font-family:monospace;font-size:12px;color:#7c3aed;text-decoration:none">${shortSha(c.sha)}</a>
          </td>
          <td style="padding:7px 0;font-size:14px;color:#111827">${esc(firstLine)}</td>
        </tr>`
    }
  }

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <h2 style="color:#111;margin:0 0 4px;font-size:20px">Sabula 256 — Weekly Dev Summary</h2>
          <p style="color:#6b7280;font-size:13px;margin:0">${weekStart} – ${weekEnd}</p>
        </div>
        <div style="background:#7c3aed;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700">
          ${commits.length} commit${commits.length !== 1 ? 's' : ''}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        ${dayRows}
      </table>

      <div style="border-top:1px solid #e5e7eb;padding-top:20px;display:flex;gap:16px;flex-wrap:wrap">
        <a href="https://github.com/${OWNER}/${REPO}/commits/master" style="font-size:13px;color:#7c3aed;text-decoration:none">
          View all commits →
        </a>
        <a href="${SITE}/admin/analytics" style="font-size:13px;color:#7c3aed;text-decoration:none">
          Admin dashboard →
        </a>
        <a href="https://github.com/${OWNER}/${REPO}/blob/master/docs/devlog/DEVLOG.md" style="font-size:13px;color:#7c3aed;text-decoration:none">
          Dev log →
        </a>
      </div>

      <p style="margin-top:24px;font-size:11px;color:#9ca3af">
        Delivered every Sunday at 8am EAT · Sabula 256 · ${SITE}
      </p>
    </div>`

  await sendEmail(
    TO,
    `Sabula 256 · Weekly Dev Summary · ${weekStart} – ${weekEnd}`,
    html,
  )

  return NextResponse.json({ sent: true, commits: commits.length })
}
