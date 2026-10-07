/**
 * Sabula 256 — cross-platform social media poster
 *
 * Usage:
 *   node scripts/social-post.mjs "Your message here"
 *   node scripts/social-post.mjs "Message" --link https://sabula256.com/markets/xyz
 *   node scripts/social-post.mjs "Message" --platforms twitter,telegram
 *
 * Required env vars (add to .env.social or export in shell):
 *   TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 *   FACEBOOK_PAGE_ID, FACEBOOK_PAGE_TOKEN
 *   INSTAGRAM_USER_ID, INSTAGRAM_PAGE_TOKEN   (Instagram Business linked to FB Page)
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID   (e.g. @sabula256)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import crypto from 'crypto'

// ── Load .env.social if present ───────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), '.env.social')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch { /* .env.social not found — rely on shell env */ }

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
if (!args.length || args[0] === '--help') {
  console.log(`
Usage: node scripts/social-post.mjs "Your message" [options]

Options:
  --link <url>              Append a link to the post
  --platforms <list>        Comma-separated: twitter,facebook,instagram,telegram (default: all)
  --image <path>            Local image path to attach (Twitter + Facebook)
  --dry-run                 Print what would be posted without sending

Example:
  node scripts/social-post.mjs "Will Uganda qualify for AFCON 2027? Bet now!" --link https://sabula256.com
`)
  process.exit(0)
}

const message  = args[0]
let link       = null
let platforms  = ['twitter', 'facebook', 'instagram', 'telegram']
let dryRun     = false

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--link')      { link = args[++i] }
  if (args[i] === '--platforms') { platforms = args[++i].split(',').map(s => s.trim()) }
  if (args[i] === '--dry-run')   { dryRun = true }
}

const fullText = link ? `${message}\n\n${link}` : message

console.log('\n📢 Sabula 256 — Social Media Poster')
console.log('─'.repeat(45))
console.log(`Message  : ${message}`)
if (link) console.log(`Link     : ${link}`)
console.log(`Platforms: ${platforms.join(', ')}`)
if (dryRun) console.log('⚠️  DRY RUN — nothing will be posted\n')
console.log('─'.repeat(45))

// ── Twitter/X ─────────────────────────────────────────────────────────────────
async function postTwitter(text) {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env
  if (!TWITTER_API_KEY) throw new Error('TWITTER_API_KEY not set')

  const url = 'https://api.twitter.com/2/tweets'
  const method = 'POST'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')

  const oauthParams = {
    oauth_consumer_key:     TWITTER_API_KEY,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            TWITTER_ACCESS_TOKEN,
    oauth_version:          '1.0',
  }

  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const baseString = [
    method,
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&')

  const signingKey = `${encodeURIComponent(TWITTER_API_SECRET)}&${encodeURIComponent(TWITTER_ACCESS_TOKEN_SECRET)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  const authHeader = 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')

  const res = await fetch(url, {
    method,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return `https://x.com/i/web/status/${data.data.id}`
}

// ── Facebook Page ─────────────────────────────────────────────────────────────
async function postFacebook(text, pageLink) {
  const { FACEBOOK_PAGE_ID, FACEBOOK_PAGE_TOKEN } = process.env
  if (!FACEBOOK_PAGE_ID) throw new Error('FACEBOOK_PAGE_ID not set')

  const body = { message: text, access_token: FACEBOOK_PAGE_TOKEN }
  if (pageLink) body.link = pageLink

  const res = await fetch(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return `https://facebook.com/${data.id}`
}

// ── Instagram (caption post — requires image URL for real media posts) ────────
async function postInstagram(caption) {
  const { INSTAGRAM_USER_ID, INSTAGRAM_PAGE_TOKEN } = process.env
  if (!INSTAGRAM_USER_ID) throw new Error('INSTAGRAM_USER_ID not set')

  // Instagram requires an image for feed posts.
  // This posts a text-only story caption update.
  // For real posts with images, pass image_url below.
  const IMAGE_URL = process.env.INSTAGRAM_DEFAULT_IMAGE_URL
  if (!IMAGE_URL) throw new Error('INSTAGRAM_DEFAULT_IMAGE_URL not set — Instagram requires an image URL for every post')

  // Step 1 — create container
  const container = await fetch(`https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: IMAGE_URL, caption, access_token: INSTAGRAM_PAGE_TOKEN }),
  }).then(r => r.json())
  if (!container.id) throw new Error(JSON.stringify(container))

  // Step 2 — publish
  const pub = await fetch(`https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: INSTAGRAM_PAGE_TOKEN }),
  }).then(r => r.json())
  if (!pub.id) throw new Error(JSON.stringify(pub))
  return `https://instagram.com/p/${pub.id}`
}

// ── Telegram Channel ──────────────────────────────────────────────────────────
async function postTelegram(text) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID } = process.env
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set')

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, text, parse_mode: 'HTML' }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(JSON.stringify(data))
  return `https://t.me/${String(TELEGRAM_CHANNEL_ID).replace('@', '')}/${data.result.message_id}`
}

// ── Run ───────────────────────────────────────────────────────────────────────
const runners = { twitter: postTwitter, facebook: postFacebook, instagram: postInstagram, telegram: postTelegram }

const results = await Promise.allSettled(
  platforms.map(async (platform) => {
    const fn = runners[platform]
    if (!fn) return { platform, status: 'skipped', reason: 'unknown platform' }
    if (dryRun) return { platform, status: 'dry-run' }
    const postUrl = platform === 'facebook'
      ? await fn(fullText, link)
      : await fn(fullText)
    return { platform, status: 'ok', url: postUrl }
  })
)

console.log('\nResults:')
results.forEach((r, i) => {
  const platform = platforms[i]
  if (r.status === 'fulfilled') {
    const v = r.value
    if (v.status === 'ok')       console.log(`  ✅ ${platform.padEnd(12)} ${v.url}`)
    if (v.status === 'dry-run')  console.log(`  🔵 ${platform.padEnd(12)} (dry run)`)
    if (v.status === 'skipped')  console.log(`  ⚠️  ${platform.padEnd(12)} skipped — ${v.reason}`)
  } else {
    console.log(`  ❌ ${platform.padEnd(12)} ${r.reason?.message ?? r.reason}`)
  }
})
console.log()
