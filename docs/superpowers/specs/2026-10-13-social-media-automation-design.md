# Social Media Automation — Sabula 256

**Date:** 2026-10-13
**Status:** Approved for implementation

## Overview

Automated social media posting engine for Sabula 256 (`sabula256.com`) that publishes market cards and AI-generated captions to TikTok, X (Twitter), and Instagram. Posts are triggered on a schedule (3×/day EAT) and by platform events (new market, odds spike, closing soon, big bet).

**Build order:** TikTok → X → Instagram

---

## 1. Data Layer

### Migration 0020: `social_posts` + `social_settings`

```sql
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'x', 'instagram')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'new_market', 'odds_spike', 'closing_soon', 'big_bet')),
  caption TEXT,
  image_url TEXT,
  platform_post_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ
);

CREATE INDEX social_posts_market_platform_trigger ON social_posts(market_id, platform, trigger_type, created_at DESC);

CREATE TABLE social_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  tiktok_enabled BOOLEAN NOT NULL DEFAULT true,
  x_enabled BOOLEAN NOT NULL DEFAULT true,
  instagram_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO social_settings DEFAULT VALUES;
```

**Deduplication rule:** Before posting, check `social_posts` for an existing `posted` row with the same `market_id + platform + trigger_type` within the last 24 hours.

**Image storage:** Market card PNGs stored in the existing `settlement-evidence` bucket under `social-cards/{marketId}-{timestamp}.png`.

---

## 2. Image Generation

**Route:** `GET /api/social/card/[marketId]` → returns `image/png`

Uses Satori (`@vercel/og`, already in the project). Renders a 1200×630 dark card using mk-* design tokens:

- Top bar: "SABULA 256" logo left, category badge right
- Market title (large, white, max 2 lines)
- YES/NO probability bars (green/red, percentage labels)
- Footer: pool size (UGX K/M format), predictor count, closing countdown, `sabula256.com`

After generating, the PNG is uploaded to Supabase storage and the public URL returned. This URL is reused across all three platforms (Instagram and TikTok require a public URL; X accepts binary but we store it anyway for the audit log).

---

## 3. AI Content Generation

**File:** `src/lib/social/generate-caption.ts`

Calls `claude-haiku-4-5-20251001` with market data. Returns `{ caption: string, hashtags: string[] }`.

**Platform tones:**
- **TikTok:** 1–2 sentences, casual/hype, 3 trending hashtags (`#fyp #Uganda #Sabula256`)
- **X:** Debate-bait hook under 280 chars, 3 topical hashtags
- **Instagram:** Emoji-rich question hook, 6–8 hashtags

**Trigger modifiers:**
- `scheduled` → balanced, informational
- `new_market` → "just launched" framing
- `odds_spike` → "odds just shifted dramatically"
- `closing_soon` → FOMO ("last 24 hours to predict")
- `big_bet` → social proof ("someone just staked UGX X")

One Haiku call per platform. For a full 3-platform scheduled batch: 3 calls (~$0.0003 total).

---

## 4. Platform Posting Clients

**Directory:** `src/lib/social/platforms/`

### `tiktok.ts`
- Auth: OAuth 2.0. Access token stored in env (`TIKTOK_ACCESS_TOKEN`), refresh token in `TIKTOK_REFRESH_TOKEN`. Token refresh handled automatically on 401.
- Photo post: `POST https://open.tiktokapis.com/v2/post/publish/content/init/` with `{ post_info: { title, privacy_level: "SELF_ONLY" (sandbox) | "PUBLIC_TO_EVERYONE" }, source_info: { source: "PULL_FROM_URL", photo_images: [url], photo_cover_index: 0 } }`
- Returns `{ publish_id }` → stored as `platform_post_id`

### `x.ts`
- Auth: OAuth 1.0a (API Key + Access Token, no refresh needed)
- Upload image: `POST https://upload.twitter.com/1.1/media/upload.json` → `media_id`
- Post tweet: `POST https://api.twitter.com/2/tweets` `{ text, media: { media_ids: [media_id] } }`

### `instagram.ts`
- Auth: Long-lived User Access Token (60-day expiry, auto-refreshed)
- Create container: `POST /{INSTAGRAM_USER_ID}/media` `{ image_url, caption, access_token }`
- Wait 5s for processing
- Publish: `POST /{INSTAGRAM_USER_ID}/media_publish` `{ creation_id, access_token }`

Each client returns `{ success: boolean, platformPostId?: string, error?: string }`. Failures are logged but do not throw — other platforms continue.

---

## 5. Cron Routes

Both routes use existing `CRON_SECRET` bearer token check.

### `/api/cron/social-scheduled`
**Schedule:** `0 5,9,15 * * *` (8am, 12pm, 6pm EAT)

1. Check `social_settings` — skip disabled platforms
2. Query top 3 markets: open, `closes_at > now()`, ordered by `(recent bet count in last 6h DESC, total_pool DESC)`
3. For each market: generate card image → generate captions (3 platforms) → post to each enabled platform → log to `social_posts`

### `/api/cron/social-events`
**Schedule:** `*/15 * * * *` (every 15 min)

Checks 4 trigger conditions against the last 15 min window:

| Trigger | Detection query |
|---|---|
| `new_market` | `markets WHERE created_at > now() - interval '15 min' AND status = 'open'` |
| `odds_spike` | `pool_depth_snapshots` — compare latest vs 15-min-ago snapshot; flag if any option moved >10% |
| `closing_soon` | `markets WHERE closes_at BETWEEN now() AND now() + interval '24h'` + no `closing_soon` post in last 25h |
| `big_bet` | `transactions WHERE type='bet' AND amount > 50000 AND created_at > now() - interval '15 min'` |

For each trigger found: generate card + captions → post → log.

---

## 6. Admin UI — `/admin/social`

New page in the existing admin panel (same sidebar, mk-* tokens).

- **Platform toggles:** Three on/off switches (TikTok / X / Instagram). PATCH `/api/admin/social-settings` updates `social_settings` row.
- **Post history table:** 50 most recent rows from `social_posts` — platform icon, market title, trigger type, status badge (posted/failed), timestamp, link to platform post.
- **Manual trigger button:** "Post now" → calls `/api/cron/social-scheduled` directly (guarded by `guardAdmin()`).

---

## 7. Environment Variables

```
TIKTOK_CLIENT_KEY=awee02hjx4utstp7
TIKTOK_CLIENT_SECRET=gdbAh22wzOaIwCRD9ihzQSDm9FAOwr6A
TIKTOK_ACCESS_TOKEN=      # obtained via OAuth flow
TIKTOK_REFRESH_TOKEN=     # obtained via OAuth flow
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
ANTHROPIC_API_KEY=
```

---

## 8. TikTok App Setup Prerequisites

Before the TikTok client works:

1. In TikTok Developer Portal: add **Content Posting API** product, add scopes `video.publish` + `video.upload`
2. Fill in app Basic Information (name, description, ToS/Privacy URLs, platform: Web)
3. Set OAuth redirect URI to `https://sabula256.com/api/auth/tiktok/callback`
4. Build a one-time OAuth flow at `/api/auth/tiktok/authorize` → callback saves access + refresh tokens to Vercel env
5. Use `privacy_level: "SELF_ONLY"` in sandbox; switch to `"PUBLIC_TO_EVERYONE"` after app review approval

---

## File Checklist

```
src/lib/social/
  generate-caption.ts
  generate-card.ts          (calls /api/social/card/[marketId] internally or shares Satori logic)
  platforms/
    tiktok.ts
    x.ts
    instagram.ts
  post-to-platforms.ts      (orchestrator: card + captions + post to all enabled platforms + log)
src/app/api/social/
  card/[marketId]/route.ts  (Satori PNG endpoint)
src/app/api/cron/
  social-scheduled/route.ts
  social-events/route.ts
src/app/api/admin/
  social-settings/route.ts  (PATCH toggle platforms)
src/app/api/auth/tiktok/
  authorize/route.ts        (one-time OAuth init)
  callback/route.ts         (exchange code → tokens → save to env via Vercel API)
src/app/(admin)/admin/social/
  page.tsx
supabase/migrations/
  0020_social_posts.sql
```
