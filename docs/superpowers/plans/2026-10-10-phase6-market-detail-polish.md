# Phase 6 — Market Detail Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six silent gaps in the market detail page that degrade mobile UX: token debt in TradePanel, dropped predictor count, missing close-time urgency, flat bet-success feedback, and a broken outcome-picker for 5-way markets.

**Architecture:** Three focused edits to existing components — no new files, no new dependencies, no architecture change. `MarketPageClient` already coordinates all shared state; tasks add props to pass downward. TDD gate for this purely visual work is manual viewport inspection in browser DevTools (no Jest infrastructure exists).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion (already installed), Supabase real-time.

**Spec:** `P:\claude\sasabets\docs\superpowers\specs\2026-10-10-phase6-market-detail-polish-design.md`

## Global Constraints

- Always-dark: no light-mode styles, no `dark:` prefixes — the design system is dark-only.
- Token-first: use `--mk-*` CSS custom properties and Tailwind aliases (`bg-mk-card`, `text-mk-text`, `border-mk-border`, `bg-mk-raised`, `text-mk-muted`, `bg-mk-accent`, `text-mk-yes`, `text-mk-no`, `bg-mk-yes-bg`, `bg-mk-no-bg`, `border-mk-yes`, `border-mk-no`) for all colors. Raw hex is only permitted for `OUTCOME_COLORS` palette values.
- Border-radius tokens: `rounded-r-card`, `rounded-r-btn`, `rounded-r-pill`, `rounded-r-input`.
- No new npm dependencies.
- Minimum tap target: 44×44 px on all interactive elements.
- TypeScript strict — no `any`, no unused imports.

## Review Focus

1. **MobileStickyBar tab tap must not open the sheet** — tapping a tab calls `onSelectOutcome(o)` only; the sheet opens only when YES or NO is tapped. A regression here opens the sheet on every outcome switch.
2. **Close-time hydration mismatch** — `closeLabel` is computed from `Date.now()` which differs between server and client. Must be `null` on first render (set only inside `useEffect`) so the chip is absent on SSR and appears after hydration. No `suppressHydrationWarning` needed if this is followed.
3. **Confetti fires once per bet** — `Confetti` mounts a canvas on `document.body` and removes it after 4 s. If `done === true` when the sheet is closed and reopened, `Confetti` remounts and fires again. Verify the success state prompts "Bet Again" which resets `done` to `false` before the sheet closes.
4. **Binary markets (2 outcomes) must be unaffected** — `MobileStickyBar` branches on `activeOutcomes.length >= 3`. Every open binary market must still show the current single-outcome layout with full-width YES/NO buttons.
5. **`predictorCount === 0`** — the stat chip must render `0 predictors` rather than hiding, so layout is stable from the first load.

---

### Task 1 — TradePanel: token migration + quick-amount chips + Confetti

**Files:**
- Modify: `src/app/(client)/markets/[id]/TradePanel.tsx`

**Interfaces:**
- Consumes: `Confetti` from `@/components/Confetti` — signature `({ onDone?: () => void }): null`
- Produces: nothing consumed by later tasks — this task is self-contained

**Background:** `TradePanel` was written before the Phase 2 design system. It uses nine hardcoded hex values via inline `style` objects: six in the YES/NO selector (lines 209–230) and three in the trade button (lines 329–341). The quick-amount chips (line 263) use `[1000, 5000, 10000]` — amounts that don't match typical Ugandan Mobile Money denominations. The `done` success state (lines 130–158) has no animation.

- [ ] **Step 1: Open the file and locate the three change zones**

  Open `src/app/(client)/markets/[id]/TradePanel.tsx`. The three zones are:
  - **YES/NO selector** — `grid grid-cols-2 gap-2` block, lines ~209–230. Each button uses a `style` object with `background`, `border`, `color`, `boxShadow`.
  - **Quick-amount chips** — `[1000, 5000, 10000].map(v =>` line ~263.
  - **Trade button** — `style={{ background: selectedOutcome && amtNum >= 1000 ? '#22C55E' : '#1A1A1A', ... }}` block, lines ~329–341.

- [ ] **Step 2: Add Confetti import**

  At the top of the file, after the existing imports, add:
  ```tsx
  import Confetti from '@/components/Confetti'
  ```

- [ ] **Step 3: Replace YES/NO selector inline styles with Tailwind token classes**

  Find the YES/NO selector block. It currently looks like:
  ```tsx
  <button
    key={side}
    onClick={() => { onSelectSide(side); setError('') }}
    aria-pressed={isSelected}
    className="rounded-r-btn py-3 text-sm font-bold transition-all min-h-[44px]"
    style={{
      background:  isSelected ? sideBg : '#1A1A1A',
      border:      `2px solid ${isSelected ? sideColor : '#222222'}`,
      color:       isSelected ? sideColor : '#6B6B6B',
      boxShadow:   isSelected ? `0 0 12px ${sideColor}30` : 'none',
    }}
  >
  ```

  Replace the entire `<button>` element (keep its `onClick`, `aria-pressed`, children) with:
  ```tsx
  <button
    key={side}
    onClick={() => { onSelectSide(side); setError('') }}
    aria-pressed={isSelected}
    className={`rounded-r-btn py-3 text-sm font-bold transition-all min-h-[44px] border-2 ${
      isSelected
        ? side === 'yes'
          ? 'bg-mk-yes-bg border-mk-yes text-mk-yes shadow-[0_0_12px_rgba(34,197,94,0.2)]'
          : 'bg-mk-no-bg border-mk-no text-mk-no shadow-[0_0_12px_rgba(239,68,68,0.2)]'
        : 'bg-mk-raised border-mk-border text-mk-muted'
    }`}
  >
    {side.toUpperCase()} {odds !== '—' ? odds : ''}
  </button>
  ```

  Also remove the now-unused variables `sideColor` and `sideBg` from the `map` callback — they were only used in the `style` object.

- [ ] **Step 4: Replace quick-amount chip values**

  Find the line:
  ```tsx
  {[1000, 5000, 10000].map(v => (
  ```

  Change it to:
  ```tsx
  {[2000, 5000, 20000].map(v => (
  ```

  The label logic `v >= 1000 ? \`${v / 1000}K\` : v` is unchanged and still works: 2K, 5K, 20K.

- [ ] **Step 5: Replace trade button inline styles with Tailwind token classes**

  Find the trade button block:
  ```tsx
  <button
    onClick={placeBet}
    disabled={loading || !selectedOutcome || amtNum < 1000}
    className="w-full rounded-r-btn py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    style={{
      background: selectedOutcome && amtNum >= 1000 ? '#22C55E' : '#1A1A1A',
      color:      selectedOutcome && amtNum >= 1000 ? '#000000' : '#6B6B6B',
      boxShadow:  selectedOutcome && amtNum >= 1000 ? '0 4px 0 #15803d' : 'none',
      transform:  loading ? 'translateY(2px)' : 'none',
    }}
  >
  ```

  Replace with:
  ```tsx
  <button
    onClick={placeBet}
    disabled={loading || !selectedOutcome || amtNum < 1000}
    className={`w-full rounded-r-btn py-3.5 text-sm font-bold transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
      selectedOutcome && amtNum >= 1000
        ? 'bg-mk-accent text-black hover:brightness-110'
        : 'bg-mk-raised text-mk-muted'
    }`}
  >
  ```

- [ ] **Step 6: Add Confetti to the done/success state**

  Find the `if (done)` block (around line 130). It currently returns a `<div>` card. Wrap it:
  ```tsx
  if (done) {
    return (
      <>
        <Confetti />
        <div className="rounded-r-card border border-mk-border bg-mk-card p-6 text-center space-y-4">
          <div className="text-5xl">🎯</div>
          <p className="text-lg font-black text-mk-text">Prediction placed!</p>
          <p className="text-sm text-mk-secondary">
            UGX {confirmedAmt.toLocaleString()} on {selectedOutcome?.name} ({selectedSide.toUpperCase()})
          </p>
          {balance !== null && (
            <p className="text-xs text-mk-muted tabular">
              New balance: <span className="font-semibold text-mk-secondary">UGX {Number(balance).toLocaleString()}</span>
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Link
              href="/bets"
              className="flex-1 rounded-r-btn border border-mk-border py-2.5 text-sm font-semibold text-mk-secondary hover:text-mk-text transition-colors text-center"
            >
              My Bets
            </Link>
            <button
              onClick={() => { setDone(false); onSelectOutcome(null) }}
              className="flex-1 rounded-r-btn bg-mk-accent py-2.5 text-sm font-bold text-center text-black hover:brightness-110 transition-all"
            >
              Bet Again
            </button>
          </div>
        </div>
      </>
    )
  }
  ```

- [ ] **Step 7: Manual verification — open a market detail page**

  Run `npm run dev` in `P:\claude\sasabets`. Navigate to any open market (e.g. `/markets/<uuid>`).

  Check on mobile viewport (375px width in DevTools):
  - YES button: green background + green border when selected, dark background when not
  - NO button: red background + red border when selected, dark background when not
  - Quick-amount chips show `+2K`, `+5K`, `+20K`, `MAX`
  - Place a bet: confetti bursts for ~3 s, success card shows "Prediction placed!" with 🎯

  Check on desktop (1280px+): trade panel in right sidebar looks identical in behavior.

- [ ] **Step 8: Commit**

  ```bash
  git add src/app/\(client\)/markets/\[id\]/TradePanel.tsx
  git commit -m "fix(trade-panel): token migration, 2K/5K/20K chips, confetti on success"
  ```

---

### Task 2 — MarketHeader: stat row + close-time badge + remove bookmark; MarketPageClient: pass predictorCount

**Files:**
- Modify: `src/app/(client)/markets/[id]/MarketHeader.tsx`
- Modify: `src/app/(client)/markets/[id]/MarketPageClient.tsx`

**Interfaces:**
- Consumes: `predictorCount: number` already exists on `MarketPageClient` Props — it just needs to be destructured and forwarded
- Produces: `MarketHeader` now accepts `predictorCount: number` — consumed by the JSX in this task only

**Background:** `MarketPageClient` receives `predictorCount` from `page.tsx` (which queries `bets` and deduplicates by `user_id`) but never destructures it, so the value is silently dropped. `MarketHeader` shows no pool size, predictor count, or closing time. The bookmark button in `MarketHeader` is a pure `useState(false)` toggle — it does nothing persistent — while `FollowButton` at the page bottom correctly persists follows to Supabase. Keeping both creates two conflicting affordances.

- [ ] **Step 1: Update MarketPageClient to destructure and forward predictorCount**

  Open `src/app/(client)/markets/[id]/MarketPageClient.tsx`.

  Find the destructuring (line ~26):
  ```tsx
  export default function MarketPageClient({
    market: initialMarket,
    outcomes: initialOutcomes,
    initialBalance,
    isLoggedIn,
    userBet,
    accessToken,
    creatorInfo,
  }: Props) {
  ```

  Add `predictorCount`:
  ```tsx
  export default function MarketPageClient({
    market: initialMarket,
    outcomes: initialOutcomes,
    initialBalance,
    isLoggedIn,
    userBet,
    accessToken,
    creatorInfo,
    predictorCount,
  }: Props) {
  ```

  Then find the `<MarketHeader>` usage (line ~74):
  ```tsx
  <MarketHeader market={market} creatorInfo={creatorInfo} />
  ```

  Add the new prop:
  ```tsx
  <MarketHeader market={market} creatorInfo={creatorInfo} predictorCount={predictorCount} />
  ```

- [ ] **Step 2: Update MarketHeader Props type**

  Open `src/app/(client)/markets/[id]/MarketHeader.tsx`.

  Find the Props type (line ~28):
  ```tsx
  type Props = {
    market: MarketData
    creatorInfo?: { name: string; username: string | null; verified: boolean } | null
  }
  ```

  Add `predictorCount`:
  ```tsx
  type Props = {
    market: MarketData
    creatorInfo?: { name: string; username: string | null; verified: boolean } | null
    predictorCount: number
  }
  ```

  Update the function signature:
  ```tsx
  export default function MarketHeader({ market, creatorInfo, predictorCount }: Props) {
  ```

- [ ] **Step 3: Add useEffect to React import and close-time state**

  Find the React import (line 1):
  ```tsx
  import { useState } from 'react'
  ```

  Change to:
  ```tsx
  import { useState, useEffect } from 'react'
  ```

  Find the existing state declarations at the top of the component (after the function signature). Add two new state variables after `const [bookmarked, setBookmarked] = useState(false)`:
  ```tsx
  const [closeLabel, setCloseLabel] = useState<string | null>(null)
  const [closeSoon,  setCloseSoon]  = useState(false)
  ```

- [ ] **Step 4: Add close-time useEffect**

  After the state declarations, add the countdown effect. Place it after the `useState` lines and before the `cat` / `imgSrc` constants:

  ```tsx
  useEffect(() => {
    if (!market.closes_at || market.status !== 'open') return
    function update() {
      const ms = new Date(market.closes_at!).getTime() - Date.now()
      if (ms <= 0) { setCloseLabel('Closed'); setCloseSoon(true); return }
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      setCloseSoon(ms < 86_400_000)
      setCloseLabel(h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [market.closes_at, market.status])
  ```

  `closeLabel` starts as `null` (the default from `useState`), so the close-time chip is absent on SSR and appears after hydration — avoiding any hydration mismatch.

- [ ] **Step 5: Add pool formatter helper**

  Add this function directly inside the component, after the `useEffect`, before the `return`:
  ```tsx
  function fmtPool(n: number): string {
    if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
    return `UGX ${n.toLocaleString()}`
  }
  ```

- [ ] **Step 6: Add stat row JSX to the render**

  In the JSX, find the title column `<div className="min-w-0 flex-1">` block. It ends with the `market.description` paragraph (or closes before the action buttons). After the description paragraph and before the closing `</div>` of the title column, add:

  ```tsx
  {/* Stat row */}
  <div className="flex flex-wrap items-center gap-2 mt-2">
    <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
      💰 {fmtPool(Number(market.total_pool))}
    </span>
    <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
      👥 {predictorCount} predictor{predictorCount !== 1 ? 's' : ''}
    </span>
    {closeLabel && (
      <span className={`inline-flex items-center gap-1 rounded-r-pill border px-2.5 py-1 text-[12px] ${
        closeSoon
          ? 'border-red-800/40 bg-red-900/20 text-red-400'
          : 'border-mk-border bg-mk-raised text-mk-muted'
      }`}>
        ⏱ {closeLabel}
      </span>
    )}
  </div>
  ```

- [ ] **Step 7: Remove the bookmark button and its state**

  Find and delete the `bookmarked` useState line:
  ```tsx
  const [bookmarked, setBookmarked] = useState(false)
  ```

  Find and delete the entire bookmark `<button>` block in the action buttons section. It looks like:
  ```tsx
  <button
    onClick={() => setBookmarked(b => !b)}
    aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
    className={`flex h-9 w-9 items-center justify-center rounded-r-btn border transition-colors ${
      bookmarked
        ? 'border-mk-accent/50 bg-mk-accent/10 text-mk-accent'
        : 'border-mk-border bg-mk-card text-mk-muted hover:text-mk-text'
    }`}
  >
    <svg ... />
  </button>
  ```

  After deletion the action buttons row has only the WhatsApp share button and the copy-link button. The `FollowButton` component already handles persisted follows at the page bottom.

- [ ] **Step 8: Manual verification**

  Navigate to any open market. On the market detail page check:
  - Below the title, three chips appear: `💰 UGX 42K pool`, `👥 5 predictors`, `⏱ Closes in 3h 12m`
  - The close-time chip is absent for closed/settled markets
  - The close-time chip turns red for markets closing within 24 h
  - The bookmark icon is gone from the header action buttons
  - For a market with 0 predictors the chip shows `0 predictors` (not hidden)

- [ ] **Step 9: Commit**

  ```bash
  git add src/app/\(client\)/markets/\[id\]/MarketHeader.tsx
  git add src/app/\(client\)/markets/\[id\]/MarketPageClient.tsx
  git commit -m "fix(market-header): predictor count + pool + close-time stat row"
  ```

---

### Task 3 — MobileStickyBar: outcome-tab picker for 3+ outcome markets

**Files:**
- Modify: `src/app/(client)/markets/[id]/MobileStickyBar.tsx`
- Modify: `src/app/(client)/markets/[id]/MarketPageClient.tsx`

**Interfaces:**
- Consumes: `OUTCOME_COLORS` from `./types` — already imported in `MobileStickyBar`
- Produces: adds `onSelectOutcome: (o: MarketOutcome) => void` to `MobileStickyBar` Props — consumed by `MarketPageClient` which passes `setSelectedOutcome`

**Background:** `MobileStickyBar` shows a single outcome with YES/NO buttons. For binary (2-option) markets this is correct. With 5-way markets now in the feed (Champions League, NYE concert), users can't switch outcomes without closing the sheet and scrolling up to `OutcomeList`. The fix branches on `activeOutcomes.length >= 3`: binary markets are unchanged; multi-outcome markets get a scrollable tab row above fixed YES/NO buttons.

- [ ] **Step 1: Add onSelectOutcome prop to MobileStickyBar Props**

  Open `src/app/(client)/markets/[id]/MobileStickyBar.tsx`.

  Find the Props type:
  ```tsx
  type Props = {
    market: MarketData
    outcomes: MarketOutcome[]
    selectedOutcome: MarketOutcome | null
    selectedSide: 'yes' | 'no'
    onOpen: (outcome: MarketOutcome, side: 'yes' | 'no') => void
  }
  ```

  Add the new prop:
  ```tsx
  type Props = {
    market: MarketData
    outcomes: MarketOutcome[]
    selectedOutcome: MarketOutcome | null
    selectedSide: 'yes' | 'no'
    onOpen: (outcome: MarketOutcome, side: 'yes' | 'no') => void
    onSelectOutcome: (o: MarketOutcome) => void
  }
  ```

  Update the function signature:
  ```tsx
  export default function MobileStickyBar({
    market, outcomes, selectedOutcome, onOpen, onSelectOutcome,
  }: Props) {
  ```

  `selectedSide` remains in the Props type (MarketPageClient passes it) but is not destructured — it was already unused in the original function body.

- [ ] **Step 2: Compute activeOutcomes and isMulti**

  At the top of the component body, after the existing `rake` / `rawOpts` lines, add:

  ```tsx
  const activeOutcomes = outcomes.filter(o => o.status === 'active')
  const isMulti        = activeOutcomes.length >= 3
  ```

- [ ] **Step 3: Rewrite the inner flex content to branch on isMulti**

  The current inner `<div className="flex items-center gap-2">` contains an outcome-name pill and two buttons. Replace the entire contents of the outer wrapper `<div className="fixed bottom-14 ...">` — keeping the wrapper itself — with:

  ```tsx
  <div className="flex items-center gap-2">
    {isMulti ? (
      <>
        {/* Scrollable outcome tabs */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 w-max">
            {activeOutcomes.map(o => {
              const isSel  = (selectedOutcome ?? activeOutcomes[0])?.id === o.id
              const color  = OUTCOME_COLORS[o.color_index % OUTCOME_COLORS.length]
              return (
                <button
                  key={o.id}
                  onClick={() => onSelectOutcome(o)}
                  className="shrink-0 rounded-r-pill border px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] whitespace-nowrap"
                  style={isSel
                    ? { background: `${color}20`, borderColor: `${color}66`, color }
                    : { background: 'var(--mk-raised)', borderColor: 'var(--mk-border)', color: 'var(--mk-muted)' }
                  }
                >
                  {o.name.length > 12 ? o.name.slice(0, 11) + '…' : o.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fixed YES / NO buttons */}
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => { const t = selectedOutcome ?? activeOutcomes[0]; if (t) onOpen(t, 'yes') }}
            className="rounded-r-btn border border-mk-yes bg-mk-yes-bg py-3 text-sm font-bold text-mk-yes min-h-[44px] w-[68px]"
          >
            YES
          </button>
          <button
            onClick={() => { const t = selectedOutcome ?? activeOutcomes[0]; if (t) onOpen(t, 'no') }}
            className="rounded-r-btn border border-mk-no bg-mk-no-bg py-3 text-sm font-bold text-mk-no min-h-[44px] w-[68px]"
          >
            NO
          </button>
        </div>
      </>
    ) : (
      <>
        {/* Binary market — original layout */}
        <div
          className="hidden xs:flex shrink-0 h-8 w-8 rounded-full items-center justify-center text-xs font-bold"
          style={{ background: `${color}20`, color }}
        >
          {target.name.slice(0, 2).toUpperCase()}
        </div>
        <p className="flex-1 text-xs font-medium text-mk-secondary truncate hidden sm:block">
          {target.name}
        </p>
        <button
          onClick={() => onOpen(target, 'yes')}
          className="flex-1 rounded-r-btn border border-mk-yes bg-mk-yes-bg py-3 text-sm font-bold text-mk-yes min-h-[44px]"
        >
          Yes{yesOdds !== '—' ? ` ${yesOdds}` : ''}
        </button>
        <button
          onClick={() => onOpen(target, 'no')}
          className="flex-1 rounded-r-btn border border-mk-no bg-mk-no-bg py-3 text-sm font-bold text-mk-no min-h-[44px]"
        >
          No{noOdds !== '—' ? ` ${noOdds}` : ''}
        </button>
      </>
    )}
  </div>
  ```

  Note: `target`, `color`, `yesOdds`, `noOdds` are still computed above this block (unchanged from the original), so the binary branch can reference them.

- [ ] **Step 4: Pass onSelectOutcome from MarketPageClient**

  Open `src/app/(client)/markets/[id]/MarketPageClient.tsx`.

  Find the `<MobileStickyBar>` usage (lines ~116–123):
  ```tsx
  <MobileStickyBar
    market={market}
    outcomes={outcomes}
    selectedOutcome={selectedOutcome}
    selectedSide={selectedSide}
    onOpen={openSheet}
  />
  ```

  Add `onSelectOutcome`:
  ```tsx
  <MobileStickyBar
    market={market}
    outcomes={outcomes}
    selectedOutcome={selectedOutcome}
    selectedSide={selectedSide}
    onOpen={openSheet}
    onSelectOutcome={setSelectedOutcome}
  />
  ```

- [ ] **Step 5: Manual verification — binary market (2 outcomes)**

  Navigate to a binary YES/NO market (e.g. "Will Besigye be released…"). On mobile viewport (375px):
  - Sticky bar at bottom shows the original layout: outcome avatar + name pill + full-width YES / NO buttons
  - Tapping YES opens the trade sheet with that outcome pre-selected
  - No tab row visible

- [ ] **Step 6: Manual verification — multi-outcome market (5 outcomes)**

  Navigate to "Who wins the 2026/27 UEFA Champions League?" market. On mobile viewport (375px):
  - Sticky bar shows a scrollable tab row: `Real Madrid`, `Arsenal`, `Man City`, `Bayern Mu…`, `Other clu…`
  - Tapping a tab highlights it with its outcome color; no sheet opens
  - Tapping YES or NO opens the trade sheet with the currently selected outcome (the highlighted tab)
  - The selected tab persists — closing and reopening the sheet leaves it on the same outcome

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/\(client\)/markets/\[id\]/MobileStickyBar.tsx
  git add src/app/\(client\)/markets/\[id\]/MarketPageClient.tsx
  git commit -m "fix(mobile-sticky): outcome-tab picker for 3+ outcome markets"
  ```
