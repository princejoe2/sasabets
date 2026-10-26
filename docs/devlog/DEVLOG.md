# Sabula 256 — Dev Log

Weekly summaries are emailed to joelukwago1@gmail.com every Sunday at 8am EAT.
Each entry below is a session narrative — the WHY behind the commits.

---

## 2026-10-26 — SEO & AI discoverability pass (7de1e12)

Goal: get Sabula 256 cited by Perplexity, ChatGPT, and Claude when someone asks about Uganda prediction markets.

**llms.txt rewrite** — The existing file said "Next.js 14" and was missing new features. Rewrote with a proper Q&A section covering the 7 most-asked questions about the platform (is it legal, how do you win, what events, where is it based). Added payout formula, correct platform economics, all current pages including /faq and /proposals, and accurate tech stack.

**robots.ts crawler expansion** — Added OAI-SearchBot (OpenAI web search), Applebot-Extended (Apple Intelligence), Bytespider (ByteDance/TikTok), Diffbot (AI knowledge graph), YouBot (You.com), and cohere-ai. All explicitly allowed with the same rules as general crawlers.

**JSON-LD Organization + WebSite** — Added structured data to the root layout so every page carries it. Includes a SearchAction pointing to /markets?q= so Google Sitelinks Search Box can appear. Organization block includes areaServed Uganda and knowsAbout prediction markets/football/politics.

**JSON-LD Event on market pages** — Enriched the existing basic Event schema with description, startDate (created_at), eventStatus (EventScheduled/EventPostponed/EventCancelled based on status), and an Offer per outcome with the implied odds price in UGX. Perplexity and Google can now show structured event cards for individual markets.

**FAQ page** — Created /faq as a proper SSR page (not a client component) with 28 Q&A items across 6 sections: About Sabula 256, How Prediction Markets Work, Deposits & Withdrawals, Placing Predictions, Creating Markets, Account & Safety. The FAQPage JSON-LD schema is embedded inline — this is the page AI systems will cite when someone asks "how does Sabula 256 work?". Added to sitemap at priority 0.5.

**About page token migration** — The about page had survived the design-system pass with hex bg/border/text values (`#0a0a0f`, `#1e1e2e`, `text-slate-400`, etc.). Migrated all structural colors to mk-* tokens. CTA now links to /faq instead of /help.

---

## 2026-10-22 — Scale demo pools to all 44 markets (seed-demo-scale.ps1)

All 44 open markets now have demo bet pools — minimum UGX 520K, flagship markets at 2.5M–3.2M. Added a second wave of 15 demo users (43 total) and 440 more bets, then directly patched every market's `total_pool` and per-option pools to their targets.

Pool tiers: Uganda Cranes qualify AFCON / Bitcoin / Besigye (3M+) → Ballon d'Or multi / USD/UGX (2.8M–2.5M) → Cranes beat South Sudan / CECAFA / Netanyahu / Museveni / Bobi Wine (1.5M–2M) → UEFA CL / Electoral reform / African leaders (1.2M) → MTN 5G / Azawi / Nyege Nyege (700K–900K) → all others 520K–650K. Zero markets at zero pool. Total demo bets in DB: 619.

Also discovered the original seed had wrong UUIDs for two markets (Bobi Wine and BOU CBR — 8-char prefix was right but suffix differed), which caused the 409 failures from the first seed run.

---

## 2026-10-21 — Demo social-proof seed + admin-invisible ghost data (c8dcdfa)

Platform had zero users and zero bets since the July DB wipe, making it look dead to visitors. Added a social-proof seeding system: 28 ghost Ugandan user accounts + 179 bets across 13 markets (Bitcoin, Uganda Cranes AFCON, Besigye, Ballon d'Or multi-market, petrol, Azawi, Nyege Nyege, etc.) with pool boosts ranging UGX 76K–316K per market.

The trick: `is_demo BOOLEAN DEFAULT FALSE` added to `profiles` and `bets` (migration 0020). Every admin page (dashboard counts, users list, bets list, analytics, settle-queue bettor counts) filters `is_demo = false`, so the admin panel stays fresh for real users. Settlement was also patched to skip demo bets and compute the real winning pool from real bets only — so demo amounts don't dilute real payouts. Public pages show everything.

---

## 2026-10-21 — Fix null-options crash on admin pages (59a1b74)

Admin pages (`/admin/markets`, `/admin/settle-queue`) were throwing a runtime `TypeError: Cannot read properties of null (reading 'label')`. Six markets in the DB had `[null, {…}]` in their `options` JSONB array — the YES option entry was missing, leaving a null placeholder. Any `.map(opt => opt.label)` call crashed.

Fixed by filtering nulls server-side in both admin page fetches (settle-queue/page.tsx, admin/markets/page.tsx) and adding defensive `.filter(o => o !== null)` guards in SettleQueueClient, AdminMarketsClient, and SettleMarketForm. Also patched all 6 affected market rows directly in the prod DB. Deployed to production.

---

## 2026-10-11 — Codebase audit gap fixes (e585d63)

Cleared 5 leftover issues identified during the post-Phase-6 audit.

**CreateMarketForm probability bar:** The preview card showed `—%` / `—%` on new
market creation because the placeholder was never wired to real data. New markets
always start 50/50, so replaced the em-dashes with `50%`. Simple but visible.

**Dashboard + Bets token migration:** Both pages were using raw hex values
(`#0a0a0f`, `#0d0d14`, `#1e1e2e`, etc.) that predated the design-system token
pass. Migrated all structural bg/border/text to `mk-*` Tailwind tokens — now any
future theme tweak propagates automatically. Per-category accent colors on the
Bets page were intentionally left as-is.

**Admin AML actions:** The expanded flag row previously showed "Review and action
buttons coming soon." Replaced with three real actions: Dismiss (client-side
removes from list), View in Users (links to /admin/users), and Freeze Account
(PATCH /api/admin/user → sets `suspended: true, suspend_reason: 'Frozen via AML
review'`). Freeze gives inline feedback and disables itself after success.

**Updown page:** `/updown` was a bare redirect to `/markets`. Now a proper server
component that queries open `updown` and `price_level` markets from Supabase,
renders them as browseable cards with asset icon, entry/target price, window label,
pool size, countdown, and a "Predict →" link into the normal market detail flow.

---

## 2026-10-10 — Phase 4 review + Phase 5 design

**Session recovery:** PC shut off mid-session. Confirmed no work was lost — working tree
was clean. Latest commit was Phase 4 global chrome (Navbar, BottomNav, RouteProgressBar,
PullToRefresh).

**Phase 5 spec written:** Designed core user journey polish covering the 4 screens a new
user touches on day 1: Home/Markets feed, Auth page, Wallet, and Bets. Key decisions:
- Auth page gets a full design-system rewrite (was using its own inline CSS + blue tokens)
- Register form splits into 2 steps (was 6 fields in one scroll on mobile)
- Market cards get a compact mobile layout with probability bar
- Bets tab bar becomes horizontally scrollable instead of wrapping
- Wallet removes duplicate stat tiles — stats move into the hero card
- Hybrid animation approach: Framer Motion only on key moments (step transitions, deposit confirmation)

**Spec committed:** `c2f122e` at `docs/superpowers/specs/2026-10-10-phase5-core-journey-polish-design.md`

**Set up weekly dev summary email** via Vercel cron → Resend → joelukwago1@gmail.com.

**Up next:** Phase 5 implementation plan + build.

---

## 2026-10-10 — Phase 6 implementation complete (Tasks 1–3)

Executed all 3 tasks of the Phase 6 market detail polish plan inline.

**Task 1 — TradePanel token migration (dc797be):** Replaced all hardcoded hex values in the
YES/NO selector and trade button with `--mk-*` Tailwind token classes. Quick-amount chips
updated from `[1K, 5K, 10K]` to `[2K, 5K, 20K]`. Added `<Confetti />` to the success state
so a bet placement triggers the canvas confetti animation.

**Task 2 — MarketHeader stat row (ef6b1d0):** Added a stat row below the market description
with three chips: pool size (formatted as UGX 12K / 1.4M), predictor count, and a
close-time countdown that turns red when under 24h. Countdown is SSR-safe — computed
only inside a `useEffect`. Removed the duplicate bookmark button (FollowButton in page.tsx
is the canonical affordance). `predictorCount` prop wired through from `MarketPageClient`.

**Task 3 — MobileStickyBar outcome tabs (f990c7a):** For markets with 3+ active outcomes,
the sticky bar now shows a horizontally scrollable tab row of outcome pills instead of
a single name. Tapping a pill selects the outcome without opening the trade sheet; YES/NO
buttons open the sheet with the selected outcome. Binary 2-outcome markets unchanged.

---

## 2026-10-10 — Phase 5 implementation complete (Tasks 1–4)

Executed all 4 tasks of the Phase 5 core journey polish plan inline.

**Task 1 — Bets tab bar (254ba83):** Converted wrapping tab row to `overflow-x-auto scrollbar-hide`
container with `shrink-0` buttons — no more broken layout on 5 or more filters. Header top
padding tightened on mobile (`py-6 sm:py-10`).

**Task 2 — Wallet hero stats (3c74f86):** Deleted the `lg:hidden` 3-column stat tile block
(duplicate of hero card stats). Mini-stats changed from `hidden lg:flex` to always visible
`flex flex-wrap` — logged-in users see their balance info on any viewport. Deposit processing
banner gets a Framer Motion scale-in entrance animation.

**Task 3 — MarketsClient mobile cards + hero strip (61f4d44):** Added `MobileCard` component
with category emoji bubble, title (2-line clamp), status, pool size, and 64px probability
bar. Desktop keeps `ForecastCard` grid; mobile uses the new compact card. Added logged-out
hero strip ("Uganda's prediction market" + Sign up CTA) that only shows when session is null
— checked server-side in both Home and Markets pages via `auth.getSession()` to avoid
client-side flash.

**Task 4 — Auth page rewrite (ba1867e):** Full rewrite from inline `T.*` CSS object tokens
to Tailwind `--mk-*` design system classes. Register form split into 2 steps with
`AnimatePresence` slide transition (step 1: email + password + confirm; step 2: name +
phone + username + terms checkbox). All 7 handlers and the `_d()` base64 Supabase key
decode pattern preserved verbatim. `AnimatedButton` and `CSSProperties` imports removed.
