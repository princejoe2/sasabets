const FROM = 'Sabula 256 <support@sabula256.com>'

function stripBom(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = stripBom(process.env.RESEND_API_KEY ?? '')
  if (!key) { console.warn('[email] No RESEND_API_KEY'); return }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[email] Resend error:', err)
  }
}

export function btn(href: string, label: string, color = '#7c3aed') {
  return `<p style="text-align:center;margin:32px 0"><a href="${href}" style="background:${color};color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">${label}</a></p>`
}
