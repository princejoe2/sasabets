// Email template helpers for transactional notifications.
// These are NOT wired up yet — a transactional email provider (Resend) is already
// configured in src/lib/email.ts. To send, import sendEmail from there and pass
// the subject + html returned by these functions.
//
// Before sending, check the user's notification_prefs on their profile row to
// respect their opt-out choices (see src/components/NotificationPreferences.tsx).

const SITE = 'https://sabula256.com'

function wrapper(content: string) {
  return `
<div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
  <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:28px 32px;text-align:center">
    <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c4b5fd">Sabula 256</p>
  </div>
  <div style="padding:32px 28px">
    ${content}
    <p style="margin:32px 0 0;font-size:12px;color:#334155;text-align:center">
      <a href="${SITE}/profile" style="color:#6d28d9">Manage notification preferences</a> &middot;
      <a href="${SITE}" style="color:#6d28d9">sabula256.com</a>
    </p>
  </div>
</div>
  `.trim()
}

// ─── Market settled ──────────────────────────────────────────────────────────

export function marketSettledEmail(params: {
  userName: string
  marketTitle: string
  winningOption: string
  yourOption: string
  won: boolean
  payout?: number
}) {
  const { userName, marketTitle, winningOption, yourOption, won, payout } = params

  const subject = won
    ? `You won on "${marketTitle}"!`
    : `Market settled: "${marketTitle}"`

  const body = won
    ? `
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff">Congratulations, ${userName}!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
        Your prediction on <strong style="color:#e2e8f0">${marketTitle}</strong> was correct.
        The winning outcome was <strong style="color:#34d399">${winningOption}</strong>.
      </p>
      <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">Payout credited</p>
        <p style="margin:0;font-size:32px;font-weight:900;color:#34d399">UGX ${(payout ?? 0).toLocaleString()}</p>
      </div>
      <p style="text-align:center;margin:32px 0">
        <a href="${SITE}/wallet" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">View your wallet</a>
      </p>
    `
    : `
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff">Market settled</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
        <strong style="color:#e2e8f0">${marketTitle}</strong> has been settled.
        The winning outcome was <strong style="color:#f1f5f9">${winningOption}</strong>.
        You predicted <strong style="color:#94a3b8">${yourOption}</strong>. Better luck next time!
      </p>
      <p style="text-align:center;margin:32px 0">
        <a href="${SITE}/markets" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Browse open markets</a>
      </p>
    `

  return { subject, html: wrapper(body) }
}

// ─── Payout credited ─────────────────────────────────────────────────────────

export function payoutEmail(params: {
  userName: string
  amount: number
  marketTitle: string
}) {
  const { userName, amount, marketTitle } = params

  const subject = `UGX ${amount.toLocaleString()} credited to your Sabula 256 wallet`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff">Payout received, ${userName}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
      Your winnings from <strong style="color:#e2e8f0">${marketTitle}</strong> have been credited to your wallet.
    </p>
    <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">Amount</p>
      <p style="margin:0;font-size:32px;font-weight:900;color:#34d399">UGX ${amount.toLocaleString()}</p>
    </div>
    <p style="text-align:center;margin:32px 0">
      <a href="${SITE}/wallet" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">View your wallet</a>
    </p>
  `

  return { subject, html: wrapper(body) }
}

// ─── Deposit confirmed ───────────────────────────────────────────────────────

export function depositConfirmedEmail(params: {
  userName: string
  amount: number
  newBalance: number
}) {
  const { userName, amount, newBalance } = params

  const subject = `Deposit of UGX ${amount.toLocaleString()} confirmed`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff">Deposit confirmed, ${userName}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
      Your Mobile Money deposit has been processed and your wallet has been topped up.
    </p>
    <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:0 0 12px;display:flex;justify-content:space-between">
      <div style="text-align:center;flex:1">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">Deposited</p>
        <p style="margin:0;font-size:22px;font-weight:900;color:#e2e8f0">UGX ${amount.toLocaleString()}</p>
      </div>
      <div style="text-align:center;flex:1">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">New balance</p>
        <p style="margin:0;font-size:22px;font-weight:900;color:#a78bfa">UGX ${newBalance.toLocaleString()}</p>
      </div>
    </div>
    <p style="text-align:center;margin:32px 0">
      <a href="${SITE}/markets" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Place a prediction</a>
    </p>
  `

  return { subject, html: wrapper(body) }
}

// ─── Weekly digest ───────────────────────────────────────────────────────────

export function weeklyDigestEmail(params: {
  userName: string
  betsThisWeek: number
  netPnl: number
  topMarkets: { title: string; id: string }[]
}) {
  const { userName, betsThisWeek, netPnl, topMarkets } = params

  const subject = 'Your Sabula 256 weekly summary'

  const marketsHtml = topMarkets.slice(0, 3).map(m =>
    `<li style="margin:0 0 10px;padding:12px 16px;background:#111118;border:1px solid #1e1e2e;border-radius:10px">
      <a href="${SITE}/markets/${m.id}" style="color:#a78bfa;text-decoration:none;font-weight:600">${m.title}</a>
    </li>`
  ).join('')

  const pnlColor = netPnl >= 0 ? '#34d399' : '#f87171'
  const pnlStr   = `${netPnl >= 0 ? '+' : ''}UGX ${Math.abs(netPnl).toLocaleString()}`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff">Weekly digest, ${userName}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">Here's how your week looked on Sabula 256.</p>

    <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin:0 0 24px;display:flex;gap:0">
      <div style="text-align:center;flex:1">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">Bets placed</p>
        <p style="margin:0;font-size:28px;font-weight:900;color:#e2e8f0">${betsThisWeek}</p>
      </div>
      <div style="text-align:center;flex:1">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b">Net P&amp;L</p>
        <p style="margin:0;font-size:28px;font-weight:900;color:${pnlColor}">${pnlStr}</p>
      </div>
    </div>

    ${topMarkets.length > 0 ? `
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#64748b">Trending this week</p>
      <ul style="list-style:none;margin:0 0 24px;padding:0">${marketsHtml}</ul>
    ` : ''}

    <p style="text-align:center;margin:32px 0">
      <a href="${SITE}/markets" style="background:#7c3aed;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">Browse markets</a>
    </p>
  `

  return { subject, html: wrapper(body) }
}
