# Phase 5: Core User Journey Polish

**Date:** 2026-10-10  
**Scope:** Home/Markets feed · Auth page · Wallet page · Bets page  
**Animation style:** Hybrid — Framer Motion on key moments only (step transitions, deposit confirmation)

---

## Goals

Polish the four screens a real user touches on day 1 of the marketing push:
land → browse → sign up → deposit → bet. All other pages (Settings, Create, Profile) are out of scope.

Success criteria:
- Auth page uses the same design tokens (`--mk-*`) and Tailwind classes as every other page
- Register form is comfortable to complete on a 360px screen
- Market cards feel native on mobile (thumb-friendly, compact)
- Bets page tab bar never wraps to two lines
- Wallet hero shows key stats without a separate tiles row below

---

## Screen 1 — Home/Markets Feed (`MarketsClient`)

### Market cards — mobile redesign

**Current:** Desktop-first cards that stack awkwardly on mobile. No consistent compact layout.

**New mobile card layout** (single row, ~72–80px tall):
- **Left:** Category icon bubble (18×18, background from `CAT_AVATAR_BG`)
- **Centre:** Title (font-bold, 2-line clamp), closing time / status badge below
- **Right:** Pool size (abbreviated, e.g. "UGX 45k") + outcome probability bar (thin, 4px, coloured per leading option)

Featured markets (`is_featured === true`) get a colour-coded 2px top accent strip using the category colour — reusing the same `CAT` colour system already in use on the bets page.

Desktop layout unchanged — existing card components stay for `md+` breakpoints.

### Logged-out hero strip

Both server components that render `MarketsClient` (`app/(client)/page.tsx` and `app/(client)/markets/page.tsx`) already call `createClient()` and have access to the session. Pass a new `isLoggedIn: boolean` prop to `MarketsClient`. Render a slim hero strip above the feed when `!isLoggedIn`:

```
┌─────────────────────────────────────────────┐
│ Uganda's prediction market                  │
│ Predict politics, football & more.          │
│ Win via MTN / Airtel Mobile Money.          │
│                         [Sign up free →]    │
└─────────────────────────────────────────────┘
```

- Background: `var(--mk-raised)`, border bottom `var(--mk-border)`
- CTA button: `bg-mk-accent` → `/auth`
- Hidden once a user is logged in (Navbar already has the wallet/avatar)
- No animation — static render

---

## Screen 2 — Auth Page (`src/app/(client)/auth/page.tsx`)

### Problem

The auth page is completely disconnected from the design system:
- Uses inline `CSSProperties` objects instead of Tailwind
- Own color tokens (`#4f8ef7` blue, `#0e1118` card) — different from `--mk-*` violet tokens
- `fontFamily: 'system-ui'` instead of Inter (set globally in Phase 2)
- Own border-radius (`10px`, `16px`) instead of `rounded-r-btn`, `rounded-r-card` tokens

### Fix — design system alignment

Rewrite all inline styles to Tailwind + `--mk-*` token classes. Functionally identical — same state machine, same API calls, same validation. Visual result: auth page looks like it belongs to the same app.

Specific token mappings:
- Background: `bg-mk-bg` (was `#07090f`)
- Card: `bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl` (was inline)
- Inputs: `bg-mk-raised border border-mk-border rounded-r-btn focus:border-mk-accent` (was inline)
- Primary button: `bg-mk-accent text-black font-bold rounded-r-btn` (was `#4f8ef7`)
- Accent text/links: `text-mk-accent` (was `#4f8ef7`)
- Muted text: `text-mk-muted` (was `#5a6080`)

### Register — 2-step form

**Problem:** Register has 6 fields in one scroll — cramped on 360px screens.

**New flow:**

```
Step 1                        Step 2
┌────────────────────┐        ┌────────────────────┐
│ ● ○                │  →     │ ○ ●                │
│ Email              │        │ Full name          │
│ Password           │        │ Phone number       │
│ Confirm password   │        │ Username (opt.)    │
│ [Next →]           │        │ ☐ Terms            │
└────────────────────┘        │ [Create account]   │
                              └────────────────────┘
```

- Two dots progress indicator at top (filled dot = current step)
- Step 1 → Step 2 transition: `x: 0 → x: -40, opacity: 0` exit, `x: 40 → x: 0` enter (Framer Motion `AnimatePresence`)
- Step 2 → Step 1 (Back): reverse direction
- Validation fires per-step: Step 1 validates email + password match before advancing
- Server calls unchanged — `handleRegister()` still fires on Step 2 submit

**Login, OTP, TOTP, forgot-password screens:** Design system tokens applied, no structural changes.

---

## Screen 3 — Wallet Page (`src/app/(client)/wallet/page.tsx`)

### Stats consolidation

**Current:** Mini-stats (`hidden lg:flex` inside hero card) + separate mobile stat tiles (`lg:hidden grid grid-cols-3` below hero) = duplicated data, wasted vertical space on mobile.

**Fix:** Remove the `lg:hidden` stat tiles section entirely. Make the mini-stats row always visible inside the hero card (remove `hidden lg:flex`, replace with just `flex`). Adjust hero card padding slightly so stats fit comfortably at all widths.

Before: hero → stat tiles → form  
After: hero (with stats inside) → form

Saves ~120px of vertical space on mobile before the user reaches the deposit/withdraw form.

### Deposit confirmation animation

After `handleDeposit()` succeeds and `setProcessing(true)` fires, the yellow "Check your phone" banner gets a brief Framer Motion entrance:
- `initial={{ scale: 0.95, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}` over 250ms
- This is the key moment — real money just moved, user needs confidence

No other animation on the wallet page.

---

## Screen 4 — Bets Page (`src/app/(client)/bets/page.tsx`)

### Header padding

Change `py-10` → `py-6 sm:py-10` on the page header div. Saves 32px on mobile — the stats grid and tab bar reach the viewport fold sooner.

### Tab bar overflow

**Current:** `flex flex-wrap gap-1 rounded-xl border bg-[#13131a] p-1 w-fit` — wraps to 2 lines on narrow screens when all 5 tabs are visible.

**Fix:** Wrap the tab group in `overflow-x-auto scrollbar-hide` and set `w-full` instead of `w-fit`. Each tab button gets `shrink-0`. The pill group becomes a horizontal scroll container on mobile, single row always.

No animation — content-browsing screen, not a key moment.

---

## Files changed

| File | Change |
|---|---|
| `src/components/MarketsClient.tsx` | Mobile card layout rewrite + logged-out hero strip |
| `src/app/(client)/auth/page.tsx` | Full inline CSS → Tailwind + design system tokens; 2-step register |
| `src/app/(client)/wallet/page.tsx` | Remove separate stat tiles; stats always in hero; deposit banner animation |
| `src/app/(client)/bets/page.tsx` | Header `py-6 sm:py-10`; tab bar `overflow-x-auto scrollbar-hide shrink-0` |

No new dependencies. Framer Motion is already installed (used in `MobileTradeSheet`, `BottomNav`).  
No DB migrations. No API changes. No new components — changes are all within existing files.

---

## What is NOT in scope

- Settings, Profile, Create, Proposals, Leaderboard pages
- Admin panel mobile improvements
- New Framer Motion gestures (drag, swipe) — hybrid approach means animations on moments only
- PWA / offline / skeleton screens
- Any backend or API changes
