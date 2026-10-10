# Phase 6 — Market Detail Polish Design

## Goal

Fix six silent gaps in the market detail page (`/markets/[id]`) that degrade the betting experience on mobile: design-token debt in TradePanel, dropped social proof, missing close-time urgency, flat bet-success feedback, and a broken outcome-picker for multi-candidate markets.

## Context

Phases 1–5 delivered the data model, design system (`--mk-*` tokens, always-dark), mobile stability, global chrome, and core journey polish (auth, feed cards, wallet, bets tab). The market detail page was not touched in those phases. It is already well-decomposed into seven focused components and uses Framer Motion for the mobile bottom sheet. Real-time market updates arrive via a Supabase channel subscription in `MarketPageClient`.

## Scope

Five files modified, no new files, no architecture change.

| File | Change |
|---|---|
| `src/app/(client)/markets/[id]/TradePanel.tsx` | Token migration, quick-amount chips, Confetti on success |
| `src/app/(client)/markets/[id]/MarketPageClient.tsx` | Destructure + pass `predictorCount` to `MarketHeader` |
| `src/app/(client)/markets/[id]/MarketHeader.tsx` | Stat row (pool + predictors + close-time); remove duplicate bookmark button |
| `src/app/(client)/markets/[id]/MobileStickyBar.tsx` | Outcome-tab picker for 3+ outcome markets; add `onSelectOutcome` prop |

`MobileTradeSheet`, `OutcomeList`, `RulesCard`, `MarketLineChart`, and `page.tsx` are not touched.

## Global Constraints

- Always-dark: no light-mode styles. Never use `dark:` prefixes — the design system is dark-only.
- Token-first: use `--mk-*` CSS custom properties and their Tailwind utility aliases (`bg-mk-card`, `text-mk-text`, `border-mk-border`, etc.) for all colors. Raw hex values are permitted only where no token exists (e.g. `OUTCOME_COLORS` palette entries).
- Border-radius tokens: `rounded-r-card`, `rounded-r-btn`, `rounded-r-pill`, `rounded-r-input`.
- No new dependencies. Framer Motion and all existing components are already installed.
- Minimum tap target: 44×44px on all interactive elements.
- TypeScript strict — no `any`, no unused imports.

## Review Focus

1. **MobileStickyBar tab → sheet interaction**: tapping a tab should update `selectedOutcome` without opening the sheet; only tapping YES/NO should open it. A tap on a tab that also triggers `onOpen` would open the sheet unexpectedly.
2. **Close-time hydration mismatch**: `closes_at` is rendered as a formatted string client-side (`"Closes in 3h 12m"`). If this runs during SSR it will differ from the client value and cause a React hydration error. The countdown must be computed inside a `useEffect` or wrapped in `suppressHydrationWarning`.
3. **Confetti on remount**: if `TradePanel` is unmounted and remounted (e.g. sheet close/reopen) while `done === true`, `Confetti` would fire again. Verify `done` resets to `false` before the sheet is reopened.
4. **MobileStickyBar with exactly 2 outcomes**: the branch condition is `outcomes.length >= 3` for the tab picker. Markets with exactly 2 outcomes (YES/NO binary) must use the existing layout unchanged.
5. **`predictorCount` when zero**: the stat chip should render `0 predictors` rather than hiding, to avoid layout shift when the count loads.

---

## Task 1 — TradePanel: token migration + quick-amount chips + Confetti

**Files:**
- Modify: `src/app/(client)/markets/[id]/TradePanel.tsx`

### Token replacements

Replace all hardcoded hex values in the YES/NO selector buttons and the trade button with `--mk-*` token classes. Exact substitutions:

| Old value | Replacement |
|---|---|
| `#22C55E` (YES color) | `var(--mk-yes)` / `text-mk-yes` |
| `#EF4444` (NO color) | `var(--mk-no)` / `text-mk-no` |
| `rgba(34,197,94,0.12)` (YES selected bg) | `bg-mk-yes-bg` |
| `rgba(239,68,68,0.12)` (NO selected bg) | `bg-mk-no-bg` |
| `#1A1A1A` (unselected button bg) | `bg-mk-raised` |
| `#222222` (unselected border) | `border-mk-border` |
| `#6B6B6B` (inactive text) | `text-mk-muted` |
| `#15803d` (trade button shadow) | drop shadow removed; use `active:translate-y-px` instead |
| `#000000` (trade button text) | `text-black` (already a Tailwind utility, keep as-is) |

The YES/NO selector buttons (lines 209–230) use inline `style` objects. Replace with Tailwind classes:

```tsx
// selected YES
className="rounded-r-btn py-3 text-sm font-bold transition-all min-h-[44px] bg-mk-yes-bg border-2 border-mk-yes text-mk-yes shadow-[0_0_12px_rgba(34,197,94,0.2)]"

// unselected
className="rounded-r-btn py-3 text-sm font-bold transition-all min-h-[44px] bg-mk-raised border-2 border-mk-border text-mk-muted"
```

The trade button (lines 329–341): remove inline `style`, use conditional Tailwind:
```tsx
className={`w-full rounded-r-btn py-3.5 text-sm font-bold transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
  selectedOutcome && amtNum >= 1000
    ? 'bg-mk-accent text-black hover:brightness-110'
    : 'bg-mk-raised text-mk-muted'
}`}
```

### Quick-amount chips

Change the chip values from `[1000, 5000, 10000]` to `[2000, 5000, 20000]`. Keep MAX. Display label logic: `n >= 1000 ? \`${n/1000}K\` : n` — unchanged, just new values (2K, 5K, 20K).

### Confetti on bet success

Add import at top of file:
```tsx
import Confetti from '@/components/Confetti'
```

In the `done` success return block, render `<Confetti />` before the card:
```tsx
if (done) {
  return (
    <>
      <Confetti />
      <div className="rounded-r-card border border-mk-border bg-mk-card p-6 text-center space-y-4">
        ...existing success content unchanged...
      </div>
    </>
  )
}
```

Do not use `WinCelebration` — it implies market settlement ("You won!") rather than bet placement ("Prediction placed!").

---

## Task 2 — MarketHeader: stat row + close-time + remove bookmark

**Files:**
- Modify: `src/app/(client)/markets/[id]/MarketHeader.tsx`
- Modify: `src/app/(client)/markets/[id]/MarketPageClient.tsx`

### MarketPageClient: pass predictorCount

`predictorCount` is already fetched in `page.tsx` and passed to `MarketPageClient` as a prop. It is currently declared in the `Props` type but not destructured. Fix:

```tsx
export default function MarketPageClient({
  market: initialMarket,
  outcomes: initialOutcomes,
  initialBalance,
  isLoggedIn,
  userBet,
  accessToken,
  creatorInfo,
  predictorCount,   // add this
}: Props) {
```

Pass it to `MarketHeader`:
```tsx
<MarketHeader market={market} creatorInfo={creatorInfo} predictorCount={predictorCount} />
```

### MarketHeader: new props

Add to `Props`:
```tsx
type Props = {
  market: MarketData
  creatorInfo?: { name: string; username: string | null; verified: boolean } | null
  predictorCount: number
}
```

### MarketHeader: stat row

Add `useEffect` to the React import (already has `useState`). Add close-time countdown state: Place the stat row between the description (`market.description`) and the end of the flex container, spanning full width below the title column:

```tsx
const [closeLabel, setCloseLabel] = useState<string | null>(null)
const [closeSoon,  setCloseSoon]  = useState(false)

useEffect(() => {
  if (!market.closes_at || market.status !== 'open') return
  function update() {
    const ms   = new Date(market.closes_at!).getTime() - Date.now()
    if (ms <= 0) { setCloseLabel('Closed'); setCloseSoon(true); return }
    const h    = Math.floor(ms / 3600000)
    const m    = Math.floor((ms % 3600000) / 60000)
    setCloseSoon(ms < 86400000)   // < 24 h
    setCloseLabel(h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`)
  }
  update()
  const id = setInterval(update, 60000)
  return () => clearInterval(id)
}, [market.closes_at, market.status])
```

Pool formatting helper (inline, no import needed):
```tsx
function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}
```

Stat row JSX — rendered after `market.description` block, before closing `</div>` of the title column:
```tsx
<div className="flex flex-wrap items-center gap-2 mt-2">
  {/* Pool */}
  <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
    💰 {fmtPool(Number(market.total_pool))}
  </span>
  {/* Predictors */}
  <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
    👥 {predictorCount} predictor{predictorCount !== 1 ? 's' : ''}
  </span>
  {/* Close-time */}
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

### Remove bookmark button

Delete the bookmark `useState` and the bookmark `<button>` (lines 134–153 in current file). The `FollowButton` component rendered in `page.tsx` handles persisted follows/bookmarks correctly. Keeping both creates two conflicting affordances.

The action buttons section keeps only the WhatsApp share and copy-link buttons.

---

## Task 3 — MobileStickyBar: outcome-tab picker

**Files:**
- Modify: `src/app/(client)/markets/[id]/MobileStickyBar.tsx`
- Modify: `src/app/(client)/markets/[id]/MarketPageClient.tsx`

### New prop

Add `onSelectOutcome: (o: MarketOutcome) => void` to `MobileStickyBar` Props. This lets a tab tap update the selection in `MarketPageClient` state without opening the sheet.

In `MarketPageClient`, pass it:
```tsx
<MobileStickyBar
  market={market}
  outcomes={outcomes}
  selectedOutcome={selectedOutcome}
  selectedSide={selectedSide}
  onOpen={openSheet}
  onSelectOutcome={setSelectedOutcome}   // add
/>
```

### Branch logic

Inside `MobileStickyBar`:

```tsx
const activeOutcomes = outcomes.filter(o => o.status === 'active')
const isMulti = activeOutcomes.length >= 3
```

**Binary branch (`!isMulti`)** — existing layout verbatim, no change.

**Multi branch (`isMulti`)** — replace the outcome-name pill + spacer with a scrollable tab row:

```tsx
{/* Multi-outcome tab row */}
<div className="flex items-center gap-2">
  {/* Scrollable outcome tabs */}
  <div className="flex-1 overflow-x-auto scrollbar-hide">
    <div className="flex gap-1.5 w-max">
      {activeOutcomes.map(o => {
        const isSelected = selectedOutcome?.id === o.id
        const color = OUTCOME_COLORS[o.color_index % OUTCOME_COLORS.length]
        return (
          <button
            key={o.id}
            onClick={() => onSelectOutcome(o)}
            className={`shrink-0 rounded-r-pill border px-3 py-1.5 text-xs font-semibold transition-all min-h-[36px] whitespace-nowrap`}
            style={isSelected
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
      onClick={() => target && onOpen(target, 'yes')}
      className="rounded-r-btn border border-mk-yes bg-mk-yes-bg py-3 text-sm font-bold text-mk-yes min-h-[44px] w-[68px]"
    >
      YES
    </button>
    <button
      onClick={() => target && onOpen(target, 'no')}
      className="rounded-r-btn border border-mk-no bg-mk-no-bg py-3 text-sm font-bold text-mk-no min-h-[44px] w-[68px]"
    >
      NO
    </button>
  </div>
</div>
```

`target` is `selectedOutcome ?? activeOutcomes[0]` — same as today. The YES/NO buttons open the sheet with the currently selected outcome; they do not change the selection.

---

## Commit plan

- **Task 1**: `fix(trade-panel): token migration, 2K/5K/20K chips, confetti on success`
- **Task 2**: `fix(market-header): predictor count + pool + close-time stat row`
- **Task 3**: `fix(mobile-sticky): outcome-tab picker for 3+ outcome markets`
