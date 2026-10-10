# Phase 5: Core User Journey Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the four screens a new user touches on day 1 (Home feed → Auth → Wallet → Bets) so the app feels native on mobile before the marketing push.

**Architecture:** All changes are CSS/layout inside four existing files plus two server page files for prop threading. No new files, no new deps, no API changes. Framer Motion (already installed) is used only on two key moments: register step transition and deposit confirmation banner.

**Tech Stack:** Next.js 16, Tailwind CSS + `--mk-*` CSS tokens, Framer Motion 11, TypeScript

**Spec:** `docs/superpowers/specs/2026-10-10-phase5-core-journey-polish-design.md`

## Global Constraints

- No new npm packages — Framer Motion is already installed (`framer-motion`)
- No DB migrations, no API route changes
- Desktop layouts unchanged — every mobile change must be guarded with `sm:` / `md:` breakpoints or `sm:hidden` / `md:hidden`
- Design tokens: use `--mk-*` CSS vars via Tailwind utilities (`bg-mk-bg`, `text-mk-muted`, `border-mk-border`, `rounded-r-btn`, `rounded-r-card`, etc.) — not hex literals
- Auth page validation logic, state machine, and all API calls stay identical — only the JSX/styles change
- `CRON_SECRET` auth pattern on all cron routes — not relevant here (no cron routes in this plan)

## Review Focus

1. **Auth Step 1 → 2 with invalid input** — clicking "Next →" before email/password/confirm are valid must show the error and stay on Step 1, never advance to Step 2.
2. **`isLoggedIn` not passed from one of the server pages** — if either `app/(client)/page.tsx` or `app/(client)/markets/page.tsx` forgets the prop, logged-in users see the hero strip. Both pages must pass it. Check: `grep -n "isLoggedIn" src/app/\(client\)/page.tsx src/app/\(client\)/markets/page.tsx` — should appear in both.
3. **MobileCard with `total_pool === 0`** — probability bar must not render (guarded by `total > 0`) and pool label must show `UGX 0` not crash.
4. **Wallet deposit banner animation** — `motion` must be imported from `'framer-motion'`, not a local re-export. If the import is missing or wrong the page silently breaks at runtime.
5. **Bets tab bar on 360px** — after the fix, all 5 tabs (All / Active / Won / Lost / My Markets) must be reachable by horizontal scroll without wrapping. If the outer container doesn't have `overflow-x-auto` AND `w-full`, the inner buttons may still overflow the viewport.

---

## Task 1: Bets page — header padding + tab bar scroll

**Files:**
- Modify: `src/app/(client)/bets/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Locate the header div and the tab bar**

  In `src/app/(client)/bets/page.tsx`:

  Header div (around line 374):
  ```tsx
  <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
  ```

  Tab bar (around line 422):
  ```tsx
  <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1 w-fit">
  ```

- [ ] **Step 2: Fix header padding — reduce top/bottom on mobile**

  Change:
  ```tsx
  <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
  ```
  To:
  ```tsx
  <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-6 sm:py-10">
  ```

- [ ] **Step 3: Fix tab bar — scrollable single row**

  Change:
  ```tsx
  <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1 w-fit">
  ```
  To:
  ```tsx
  <div className="mb-6 w-full overflow-x-auto scrollbar-hide">
  <div className="flex gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] p-1 w-max min-w-full">
  ```
  And close the outer div after the last tab button's closing `</div>`.

  Each tab `<button>` inside the tab bar already has `rounded-lg px-4 py-1.5` — add `shrink-0` to each:
  ```tsx
  // All 5 tab buttons — add shrink-0
  className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${...}`}
  ```

  The "My Markets" button:
  ```tsx
  className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${...}`}
  ```

- [ ] **Step 4: Verify manually**

  Run dev server: `npm run dev`
  Open `http://localhost:3000/bets` in Chrome DevTools → iPhone SE (375px).
  - Header should have less vertical whitespace above the h1
  - All 5 tabs visible in a single row; horizontal swipe reveals any clipped tabs

- [ ] **Step 5: Commit**

  ```
  git add src/app/\(client\)/bets/page.tsx
  git commit -m "fix(bets): header py-6 mobile + tab bar horizontal scroll"
  ```

---

## Task 2: Wallet page — stats in hero + deposit animation

**Files:**
- Modify: `src/app/(client)/wallet/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Add Framer Motion import**

  At the top of `src/app/(client)/wallet/page.tsx`, add:
  ```tsx
  import { motion } from 'framer-motion'
  ```

- [ ] **Step 2: Make mini-stats always visible inside the hero card**

  Find the mini-stats div inside the hero card (around line 343):
  ```tsx
  <div className="mt-4 hidden lg:flex gap-6 text-sm">
  ```
  Change `hidden lg:flex` → `flex` and add `flex-wrap`:
  ```tsx
  <div className="mt-4 flex flex-wrap gap-4 text-sm">
  ```
  This makes the three stats (Deposited / Withdrawn / Won) always visible inside the hero card at all widths.

- [ ] **Step 3: Remove the separate mobile stat tiles section**

  Find and delete the entire `lg:hidden` stat tiles block (around lines 379–396):
  ```tsx
  {/* ── Stat tiles — always below hero, above form on mobile ── */}
  <div className="grid grid-cols-3 gap-2 lg:hidden">
    <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
      ...Deposited...
    </div>
    <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
      ...Won...
    </div>
    <div className="rounded-2xl border border-[#1c2622] bg-[#0e1311] p-3 text-center">
      ...Active...
    </div>
  </div>
  ```
  Delete this entire block. The stats are now only in the hero card.

- [ ] **Step 4: Animate the deposit confirmation banner**

  Find the processing banner (around line 320):
  ```tsx
  {processing && (
    <div className="flex items-center gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
  ```
  Wrap the inner `div` with `motion.div`:
  ```tsx
  {processing && (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-center gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300"
    >
      <span className="animate-spin inline-block text-base">↻</span>
      <span>
        Check your phone — enter your Mobile Money PIN to confirm.
        <span className="ml-1 text-yellow-500">Waiting for confirmation…</span>
      </span>
    </motion.div>
  )}
  ```

- [ ] **Step 5: Verify manually**

  Open `http://localhost:3000/wallet` (must be logged in).
  - On mobile viewport (375px): hero card shows Deposited / Withdrawn / Won stats inline — no separate tiles below
  - No duplicate stats visible
  - Trigger a deposit (or toggle `processing` state via React DevTools) — banner animates in with scale+fade

- [ ] **Step 6: Commit**

  ```
  git add src/app/\(client\)/wallet/page.tsx
  git commit -m "fix(wallet): stats always in hero card, deposit banner entrance animation"
  ```

---

## Task 3: Markets feed — mobile card + logged-out hero strip

**Files:**
- Modify: `src/components/MarketsClient.tsx`
- Modify: `src/app/(client)/page.tsx`
- Modify: `src/app/(client)/markets/page.tsx`

**Interfaces:**
- Consumes: `detectCat`, `gaugeColor`, `getTimeLeft`, `isEndingToday`, `fmtVol`, `CAT_AVATAR_BG` — all already defined in `MarketsClient.tsx`
- Produces: `MarketsClient` now accepts `isLoggedIn?: boolean` prop

- [ ] **Step 1: Add `MobileCard` component to MarketsClient.tsx**

  Insert this new component directly before the `/* ─── Main MarketsClient ─── */` comment (around line 381):

  ```tsx
  /* ─── MobileCard (shown on screens < md) ────────────────────── */
  const CAT_ICONS: Record<string, string> = {
    football: '⚽', politics: '🏛️', economy: '💰', entertainment: '🎵',
    tech: '📱', infrastructure: '🏗️', agriculture: '🌿', updown: '📈', default: '🔮',
  }

  function MobileCard({ market }: { market: Mkt }) {
    const opts    = market.options ?? []
    const total   = Number(market.total_pool)
    const pool1   = Number(opts[0]?.total_pool ?? 0)
    const prob1   = total > 0 ? Math.round((pool1 / total) * 100) : 50
    const cat     = detectCat(market.title, market.description ?? '', market.metadata)
    const gc      = gaugeColor(prob1)
    const timeStr = getTimeLeft(market.closes_at)
    const isOpen  = market.status === 'open'
    const endToday = isEndingToday(market.closes_at) && isOpen
    const catIcon  = CAT_ICONS[cat] ?? '🔮'
    const avatarBg = CAT_AVATAR_BG[cat] ?? '#1d1525'
    const isFeatured = market.is_featured === true

    const statusText = !isOpen
      ? (market.status === 'settled' ? 'Settled' : 'Closed')
      : endToday ? 'Ends today'
      : timeStr

    return (
      <Link
        href={`/markets/${market.id}`}
        className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
        style={{
          borderBottom: '1px solid var(--fc-card-border)',
          borderTop: isFeatured ? '2px solid var(--mk-accent)' : undefined,
        }}
      >
        {/* Category bubble */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: avatarBg }}
        >
          {catIcon}
        </div>

        {/* Title + status */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold leading-snug"
            style={{
              color: 'var(--fc-text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {market.title}
          </p>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: endToday ? '#ef4444' : 'var(--fc-text-secondary)' }}
          >
            {statusText}
          </p>
        </div>

        {/* Pool + probability bar */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: 'var(--fc-text-secondary)' }}>
            UGX {fmtVol(total)}
          </span>
          {total > 0 && (
            <div
              className="h-1 w-16 overflow-hidden rounded-full"
              style={{ background: 'var(--fc-card-border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${prob1}%`, background: gc }}
              />
            </div>
          )}
        </div>
      </Link>
    )
  }
  ```

- [ ] **Step 2: Add `isLoggedIn` prop to MarketsClient signature**

  Find the existing `MarketsClient` props interface (around line 382):
  ```tsx
  export default function MarketsClient({
    markets,
    openCount: _oc,
    initialCat = 'all',
    totalPool: _tp = 0,
    userCount: _uc = 0,
  }: {
    markets: Mkt[]
    openCount: number
    initialCat?: string
    totalPool?: number
    userCount?: number
  })
  ```
  Change to:
  ```tsx
  export default function MarketsClient({
    markets,
    openCount: _oc,
    initialCat = 'all',
    totalPool: _tp = 0,
    userCount: _uc = 0,
    isLoggedIn = true,
  }: {
    markets: Mkt[]
    openCount: number
    initialCat?: string
    totalPool?: number
    userCount?: number
    isLoggedIn?: boolean
  })
  ```

- [ ] **Step 3: Add hero strip after the sticky header**

  Find the create-your-market hero banner comment (around line 668):
  ```tsx
  {/* ══ Create-your-market hero banner ══ */}
  ```
  Insert the logged-out hero strip **before** this banner:
  ```tsx
  {/* ══ Logged-out hero strip ══ */}
  {!isLoggedIn && (
    <div
      className="mx-6 mt-3 mb-0 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'var(--mk-raised)',
        border: '1px solid var(--mk-border)',
      }}
    >
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--mk-text)' }}>
          Uganda&apos;s prediction market
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--mk-muted)' }}>
          Predict politics, football &amp; more. Win via MTN / Airtel.
        </p>
      </div>
      <Link
        href="/auth"
        className="shrink-0 rounded-r-btn px-4 py-2 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-95"
        style={{ background: 'var(--mk-accent)' }}
      >
        Sign up free →
      </Link>
    </div>
  )}

  {/* ══ Create-your-market hero banner ══ */}
  ```

- [ ] **Step 4: Replace the grid section with a responsive desktop/mobile split**

  Find the market grid section (around line 724):
  ```tsx
  {/* ══ Market grid ══ */}
  <div style={{ padding: '8px 24px 96px' }}>
    {filtered.length > 0 ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 14 }}>
        {filtered.map(m => <ForecastCard key={m.id} market={m} />)}
      </div>
    ) : (
  ```
  Replace with:
  ```tsx
  {/* ══ Market grid ══ */}
  <div style={{ paddingBottom: 96 }}>
    {filtered.length > 0 ? (
      <>
        {/* Mobile list — shown on screens narrower than md (768px) */}
        <div className="md:hidden">
          {filtered.map(m => <MobileCard key={m.id} market={m} />)}
        </div>
        {/* Desktop grid — shown on md+ */}
        <div className="hidden md:block" style={{ padding: '8px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 14 }}>
            {filtered.map(m => <ForecastCard key={m.id} market={m} />)}
          </div>
        </div>
      </>
    ) : (
  ```
  The empty state div doesn't need changes.

- [ ] **Step 5: Pass `isLoggedIn` from `app/(client)/page.tsx`**

  In `src/app/(client)/page.tsx`, the page already calls `createPublicClient()`. Add a session check with `createClient()`:
  ```tsx
  import { createClient, createPublicClient } from '@/lib/supabase/server'

  export default async function HomePage() {
    const supabase       = createPublicClient()
    const authClient     = await createClient()
    const { data: { session } } = await authClient.auth.getSession()

    // ... existing queries ...

    return (
      <div ...>
        <MarketsClient
          markets={all.map(normalise)}
          openCount={openCount}
          initialCat="all"
          totalPool={totalPool}
          userCount={userCount ?? 0}
          isLoggedIn={!!session}
        />
      </div>
    )
  }
  ```

- [ ] **Step 6: Pass `isLoggedIn` from `app/(client)/markets/page.tsx`**

  In `src/app/(client)/markets/page.tsx`, `createClient()` is already imported and called. Add:
  ```tsx
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: markets } = await supabase.from('markets')...

  return (
    <div ...>
      <MarketsClient markets={all.map(normalise)} openCount={openCount} initialCat={initialCat} isLoggedIn={!!session} />
    </div>
  )
  ```

- [ ] **Step 7: Verify manually**

  Open `http://localhost:3000` logged out on iPhone SE (375px) in DevTools:
  - Hero strip visible: "Uganda's prediction market / Sign up free →"
  - Markets show as compact rows (category bubble + title + time + pool bar)
  - Desktop (1024px): grid layout, no hero strip, no mobile rows

  Open logged in:
  - Hero strip gone
  - Mobile rows still shown on narrow viewport

  Check `MobileCard` with a market where `total_pool === 0` — probability bar div should not render.

- [ ] **Step 8: Commit**

  ```
  git add src/components/MarketsClient.tsx src/app/\(client\)/page.tsx src/app/\(client\)/markets/page.tsx
  git commit -m "feat(feed): mobile market cards + logged-out hero strip"
  ```

---

## Task 4: Auth page — design system alignment + 2-step register

**Files:**
- Modify: `src/app/(client)/auth/page.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: nothing consumed by other tasks

This task is a full JSX/CSS rewrite of `auth/page.tsx`. All logic (state variables, handlers, API calls) stays identical. Only the render return replaces inline `CSSProperties` with Tailwind + `--mk-*` tokens.

- [ ] **Step 1: Add Framer Motion import and register step state**

  At the top of the file add:
  ```tsx
  import { AnimatePresence, motion } from 'framer-motion'
  ```

  After the existing state declarations (after line ~55), add:
  ```tsx
  const [regStep,  setRegStep]  = useState<1 | 2>(1)
  const [stepDir,  setStepDir]  = useState<1 | -1>(1)
  ```

- [ ] **Step 2: Add `handleNextStep` and `handleBack` functions**

  Add these new functions before `handleRegister`:
  ```tsx
  function handleNextStep() {
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Enter a valid email address'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setStepDir(1)
    setRegStep(2)
  }

  function handleBack() {
    setError('')
    setStepDir(-1)
    setRegStep(1)
  }
  ```

  Also reset `regStep` to 1 inside the existing `switchMode` function:
  ```tsx
  function switchMode(m: Mode) {
    setMode(m); setStep('form')
    setError(''); setTotp('')
    setPassword(''); setConfirm('')
    setUsername('')
    setTermsAccepted(false)
    setRegStep(1)        // ← add this line
  }
  ```

- [ ] **Step 3: Delete the entire `T` token object and all `CSSProperties` style objects**

  Remove these const declarations entirely (lines 15–371):
  - `const T = { ... }` (the custom token object)
  - `const wrap: CSSProperties = { ... }`
  - `const card: CSSProperties = { ... }`
  - `const label: CSSProperties = { ... }`
  - `const inputStyle: CSSProperties = { ... }`
  - `const btn: CSSProperties = { ... }`
  - `const fieldGap: CSSProperties = { ... }`

  These are all replaced by Tailwind class strings defined inline in the JSX below.

- [ ] **Step 4: Rewrite the OTP confirmation screen**

  Replace the entire `if (step === 'otp')` block return with:
  ```tsx
  if (step === 'otp') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="text-xl font-black text-mk-text mb-2">Check your email</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              We sent a confirmation code to{' '}
              <strong className="text-mk-text">{email}</strong>.
              <br />Enter the 6-digit code below.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Confirmation code</label>
            <input
              style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 24 }}
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3.5 text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              inputMode="numeric"
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading || otpCode.length !== 6}
            onClick={handleVerifyOtp}
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>

          <div className="rounded-r-btn border border-blue-800/40 bg-blue-900/20 px-4 py-3 my-4">
            <p className="text-blue-300 text-[13px] leading-relaxed">
              Can&apos;t find the email? Check your spam folder. The code expires in 1 hour.
            </p>
          </div>

          <button
            className="w-full bg-mk-card border border-mk-border text-mk-text font-bold rounded-r-btn py-3.5 text-[15px] hover:bg-mk-raised transition-colors disabled:opacity-50"
            disabled={loading}
            onClick={handleResendConfirmation}
          >
            {loading ? 'Sending…' : 'Resend confirmation email'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={() => { setStep('form'); setError(''); setOtpCode('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 5: Rewrite the TOTP screen**

  Replace the entire `if (step === 'totp')` block with:
  ```tsx
  if (step === 'totp') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-7">
            <div className="text-3xl mb-2">🔐</div>
            <h1 className="text-xl font-black text-mk-text mb-1.5">Two-factor authentication</h1>
            <p className="text-sm text-mk-muted">Open your authenticator app and enter the 6-digit code</p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Authenticator code</label>
            <input
              style={{ letterSpacing: '0.25em', textAlign: 'center', fontSize: 22 }}
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading}
            onClick={handleTotpVerify}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={async () => { await supabase.auth.signOut(); setStep('form'); setTotp(''); setError('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Cancel &amp; sign out
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 6: Rewrite the forgot-password form screen**

  Replace the `if (step === 'forgot')` block:
  ```tsx
  if (step === 'forgot') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🔑</div>
            <h1 className="text-xl font-black text-mk-text mb-1.5">Reset your password</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
            <input
              type="email"
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading}
            onClick={handleForgotPassword}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={() => { setStep('form'); setError('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 7: Rewrite the forgot-sent confirmation screen**

  Replace the `if (step === 'forgot-sent')` block:
  ```tsx
  if (step === 'forgot-sent') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="text-xl font-black text-mk-text mb-2">Check your email</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              We sent a password reset link to{' '}
              <strong className="text-mk-text">{email}</strong>.
              <br />Click the link to set a new password.
            </p>
          </div>

          <div className="rounded-r-btn border border-blue-800/40 bg-blue-900/20 px-4 py-3 mb-4">
            <p className="text-blue-300 text-[13px] leading-relaxed">
              Can&apos;t find the email? Check your spam folder. The link expires in 1 hour.
            </p>
          </div>

          <button
            className="w-full bg-mk-card border border-mk-border text-mk-text font-bold rounded-r-btn py-3.5 text-[15px] hover:bg-mk-raised transition-colors"
            onClick={() => { setStep('form'); setError('') }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 8: Rewrite the main login/register form with 2-step register**

  Replace the final `return (...)` at the bottom of the component with:
  ```tsx
  return (
    <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">

        {/* Brand */}
        <div className="text-center mb-7">
          <div className="text-[13px] font-black tracking-[0.15em] text-mk-accent uppercase mb-1">
            Sabula 256
          </div>
          <h1 className="text-[22px] font-black text-mk-text mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-[13px] text-mk-muted">
            {mode === 'login' ? 'Sign in to your account' : 'Start predicting with Sabula 256'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex bg-mk-raised rounded-r-btn p-1 mb-6 gap-0.5">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-r-btn py-2.5 text-sm font-bold transition-all ${
                mode === m
                  ? 'bg-mk-accent text-black'
                  : 'text-mk-muted hover:text-mk-secondary bg-transparent'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white text-[#1f2937] border border-gray-300 rounded-r-btn py-3 text-[15px] font-bold mb-5 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-mk-border" />
          <span className="text-[12px] text-mk-muted font-semibold">or</span>
          <div className="flex-1 h-px bg-mk-border" />
        </div>

        {/* ── Login form ── */}
        {mode === 'login' && (
          <>
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
              <input
                type="email"
                className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[13px] font-semibold text-mk-muted">Password</label>
                <button
                  type="button"
                  onClick={() => { setStep('forgot'); setError('') }}
                  className="text-[12px] text-mk-accent hover:text-mk-accent/80 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            <button
              className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </>
        )}

        {/* ── Register form — 2 steps ── */}
        {mode === 'register' && (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {([1, 2] as const).map(n => (
                <div
                  key={n}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    regStep === n ? 'w-6 bg-mk-accent' : 'w-2 bg-mk-border'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait" custom={stepDir}>
              {regStep === 1 ? (
                <motion.div
                  key="step1"
                  custom={stepDir}
                  initial={{ x: stepDir * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: stepDir * -40, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
                    <input
                      type="email"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Password</label>
                    <input
                      type="password"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                  <button
                    className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all mt-2"
                    onClick={handleNextStep}
                  >
                    Next →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  custom={stepDir}
                  initial={{ x: stepDir * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: stepDir * -40, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Full name</label>
                    <input
                      type="text"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      autoFocus
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">
                      Phone <span className="font-normal text-mk-muted">(for deposits &amp; withdrawals)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">
                      Username <span className="font-normal text-mk-muted">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mk-muted text-[15px] pointer-events-none">@</span>
                      <input
                        type="text"
                        className="w-full bg-mk-raised border border-mk-border rounded-r-btn pl-7 pr-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20))}
                        placeholder="your_handle"
                        autoComplete="username"
                        maxLength={20}
                      />
                    </div>
                    {username && username.length < 3 && (
                      <p className="text-[11px] text-mk-muted mt-1">At least 3 characters</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 mb-4">
                    <input
                      id="terms-cb"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setError('') }}
                      className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--mk-accent)] cursor-pointer"
                    />
                    <label htmlFor="terms-cb" className="text-[13px] text-mk-muted leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Terms</a>
                      ,{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Privacy Policy</a>
                      {' &amp; '}
                      <a href="/responsible-gambling" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Responsible Gambling Policy</a>
                      . I am 18+.
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                  <button
                    className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
                    disabled={loading || !termsAccepted}
                    onClick={handleRegister}
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>

                  <button
                    onClick={handleBack}
                    className="w-full mt-3 text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer py-2"
                  >
                    ← Back
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
  ```

- [ ] **Step 9: Remove now-unused `AnimatedButton` import**

  At the top of the file, remove:
  ```tsx
  import AnimatedButton from '@/components/ui/animated-button'
  ```
  (It was only used in the old register submit button, now replaced by a plain button with Tailwind classes.)

- [ ] **Step 10: Verify manually**

  Run `npm run dev` and open `http://localhost:3000/auth` on iPhone SE (375px):

  **Login tab:**
  - Colors match rest of app (violet accent, dark card)
  - Font is Inter (not system-ui)
  - Google button visible and white
  - Error message shows in red on wrong password

  **Register tab:**
  - Step indicator shows two dots (first filled)
  - Email/password/confirm on Step 1
  - Clicking "Next →" with mismatched passwords: shows error, stays on Step 1
  - Clicking "Next →" with valid fields: Step 2 slides in from the right
  - Step 2 shows name/phone/username/terms
  - "← Back" slides Step 1 back in from the left
  - "Create account" disabled until terms checkbox ticked

  **OTP screen:**
  - Large centered input, matches app tokens
  - "Back to sign in" link works

  **Forgot password:**
  - Full flow works (send → confirmation screen → back to sign in)

- [ ] **Step 11: Commit**

  ```
  git add src/app/\(client\)/auth/page.tsx
  git commit -m "feat(auth): design system alignment + 2-step register form"
  ```

---

## Final: Update devlog

- [ ] Append today's session entry to `docs/devlog/DEVLOG.md` summarising Phase 5 implementation

  ```
  git add docs/devlog/DEVLOG.md
  git commit -m "devlog: 2026-10-10 phase 5 implementation"
  ```
