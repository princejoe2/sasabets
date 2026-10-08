# Sabula 256: Market UI rebuild (mobile-first, pure black, multi-candidate)

You are working in `P:\claude\SasaBets`. The product is **Sabula 256**, a prediction market. Currency is **UGX**.

Reference material is in `design-ref/`:
- `design-ref/mobile/`: mobile screenshots of another prediction-market site
- `design-ref/desktop/`: desktop screenshots of the same site
- `design-ref/video/`: frames from a screen recording (in order: `frame_001.png`, `frame_002.png` and so on). Use them to understand the animations: auto-sliding candidate rows, chart draw-in, count-up, back-to-top button and pull-to-refresh pill.

Open and study **every** reference image before you design anything. Match their **layout, spacing, hierarchy, behaviour and motion**, but in a **pure black theme** with **Sabula 256's own name, logo and branding**. Never copy the reference site's name, logo, mascot, wordmark, icons or copy text.

---

## HARD RULES (apply to every phase)

1. **Do not change** betting, wallet, payout, odds or pricing maths, or the MTN/Airtel Mobile Money logic. This job covers UI, multi-candidate support and images. If a UI change seems to need one of those, stop and ask me.
2. **No second versions.** If a market-page rebuild, design tokens, a chart component or a trade panel already exists, extend or replace it. Do not add `MarketPageV2`, `new-theme.css` or anything similar. Delete dead and conflicting styles and components you replace.
3. **No patches.** No `!important`, no one-off inline colours, no `overflow-x: hidden` on body to hide bugs. Every colour, radius, spacing value, shadow, z-index and font comes from tokens.
4. **One component, two layouts.** Mobile and desktop use the same components. Layout changes only through responsive CSS, never through duplicated mobile/desktop component trees.
5. **Checkpoints.** STOP and wait for my reply: (a) after the Phase 0 plan, (b) before you apply the settlement change in Phase 1. Make a git commit at the end of every phase, with a clear message.
6. After every phase, run typecheck, lint and build. Fix every error before you move on.

---

## PHASE 0: Inspect, then plan (then STOP)

Inspect and report briefly:
- Framework and version, routing, rendering (SSR/CSR), and state/data-fetching library.
- Styling (Tailwind version and config, CSS modules, globals), and any existing tokens or theme.
- Existing components: header, nav, market card, market page, chart, trade panel, modals and sheets.
- Chart library (if any). Recommend one: keep the existing one if it can do multi-series, draw-in animation and a touch crosshair, otherwise suggest a lightweight option.
- Auth flow (provider and methods) and how the "logged in" state is read.
- Storage (Supabase Storage, S3 or a local public folder).
- DB schema for markets, outcomes, bets, odds/prices, settlement and price history. Name the exact tables and columns, and the code that settles bets.
- Brand colour (if one exists) and the logo files.
- Any earlier market-page rebuild work.

Then give a **short plan**: the files you will create, change or delete, the migration outline, the chart library choice, and the risks. **STOP and wait for my OK.**

---

## PHASE 1: Multi-candidate data model

- A market has **2..N outcomes**. A binary market is simply the outcomes "Yes"/"No", so **one code path** serves both.
- Add these with a **safe, additive migration** (no data loss; backfill existing markets into outcomes), only if they are missing:
  - `market_outcomes`: id, market_id, name, image_url, image_source, image_credit, image_override (bool), image_needs_review (bool), sort_order, status (active/resolved_yes/resolved_no), probability, color_index
  - `outcome_price_history`: outcome_id, probability, recorded_at (index on outcome_id + recorded_at)
- A bet stores **outcome_id + side (YES/NO)**. Odds per outcome/side come from our **existing** pricing logic. Wrap it; do not rewrite it.
- `color_index` is assigned once per outcome and never changes. The palette is in Phase 2.
- **Settlement:** for a multi-candidate market, YES on the winner and NO on every loser win; everything else loses. **Show me the exact diff of the settlement code and STOP for approval before applying it.**
- Admin: add, remove, reorder (drag or arrows) and resolve candidates; upload or replace candidate images (an upload sets `image_override = true`).

---

## PHASE 2: Design system (one source of truth)

Define everything as CSS variables and map them into the Tailwind theme (if Tailwind is used). Remove the old, conflicting values.

**Colours**
- bg `#000000`, surface `#0A0A0A`, card `#111111`, raised `#1A1A1A`
- border `#222222`, card border `rgba(255,255,255,0.08)`
- text primary `#F5F5F5`, secondary `#A1A1A1`, muted `#6B6B6B`
- YES `#22C55E`, YES tint bg `rgba(34,197,94,0.12)`, YES text `#4ADE80`
- NO `#EF4444`, NO tint bg `rgba(239,68,68,0.12)`, NO text `#F87171`
- Accent: Sabula 256's existing brand colour, or `#FF9F43` if there is none. Use it for Sign in, Trade, active underlines, "% chance" text and binary chart lines.
- Candidate palette (assigned permanently by `color_index`): `#F5B83D #EC4899 #3B82F6 #22C55E #A855F7 #F97316 #14B8A6 #EAB308`
- Set `color-scheme: dark` and a black `<html>`/`<body>` background (no white flash on load or route change), and a theme-color meta of `#000000`.

**Type:** Inter 400/500/600/700, self-hosted or `next/font`, with `font-display: swap`. Use `font-feature-settings: "tnum"` on every number (prices, %, volumes, balances).

**Radii:** cards 16px, buttons 12px, pills 999px. Cards have a 1px card-border.

**Spacing scale, shadows, motion tokens:** durations 150/250/400/800ms; an ease-out curve and a spring curve.

**Z-index tokens, lowest to highest:** content < sticky-header < buy-bar < bottom-nav < sheet-backdrop < sheet < modal < toast < progress-bar.
The sticky buy bar sits **directly above** the bottom nav, never behind it and never overlapping it.

---

## PHASE 3: Stability foundations (the most important requirement)

The mobile UI must be rock solid from **320px to 430px**: no sideways scrolling, no overlap, no layout jumping.
- Find and fix the **root causes** of overflow: fixed widths, `100vw`, negative margins, flex/grid children without `min-width: 0`, long unbroken strings, and wide images, charts or tables. Only after that, add `overflow-x: clip` on the app root as a safety net.
- Use `100dvh` (never `100vh`). Apply `env(safe-area-inset-*)` to the header, buy bar, bottom nav and sheets.
- Text: titles clamp to 2 lines; candidate names truncate with an ellipsis; user content and comments use `overflow-wrap: anywhere`.
- Every image and async block has a **reserved box** (aspect-ratio or fixed size) and a matching skeleton. Target CLS ≈ 0.
- Inputs have font-size ≥ 16px (no iOS zoom). Tap targets are ≥ 44px.
- Lock body scroll while a sheet or modal is open. Scrollable sheets use `overscroll-behavior: contain`.
- Page content gets bottom padding equal to buy bar + bottom nav + safe-area, so the last item is always visible.
- Every animation uses only transform/opacity, and is disabled under `prefers-reduced-motion`.

---

## PHASE 4: Global chrome

**Mobile**
- Sticky header: Sabula 256 logo on the left. On the right: an accent "Sign in to trade" button (logged out) or balance + avatar (logged in), and a ☰ menu.
- Category row: "🔥 Hot" (red, with a soft red glow when active), "New", a thin divider, then categories. Scrolls horizontally with snap and no scrollbar. The active item is white with an accent underline.
- Fixed bottom nav: Home, Search, New, More (icon + label, active item white). After about one screen of scroll, a round **back-to-top ↑** button fades and scales into the centre of the nav (see the video frames). Tapping it smooth-scrolls to the top.
- A 2px accent **route progress bar** at the very top on every navigation, plus skeletons.
- **Custom pull-to-refresh** on the feed and the market page: a small dark pill with 5 bouncing equalizer bars in brand colours (see the reference). It follows the finger with resistance, triggers at about 70px, keeps animating while data refetches, then shrinks away. Implement it with touch events and disable the native one with `overscroll-behavior-y: contain`. Respect reduced motion.

**Desktop (≥1024px):** a single top bar with the logo, a search field, the category row and the auth/balance area. No bottom nav. Content container max-width about 1280px, centred, with hover states on all interactive elements.

---

## PHASE 5: Market page (top priority: match the desktop and mobile references closely)

**Layout**
- Mobile: a single column, in the order below, with a sticky buy bar above the bottom nav.
- Desktop (≥1024px): two columns. Left: main content (flexible). Right: a 360–380px **sticky trade panel** (top = header height), with "Related" under it. Match the desktop screenshots for spacing and proportions.

**Sections**
1. **Header:** 48px rounded image (64px on desktop); breadcrumb "Category · Subcategory · ✓ · Check source ↗" (accent link); title ~22px that wraps (no clamp here); share / embed / bookmark icons in a row.
2. **Probability header:**
   - Binary: a big accent "NN% chance" with a faint Sabula 256 watermark on the right.
   - Multi-candidate: a legend of coloured dot + name + %, wrapping onto multiple lines.
3. **Chart:** full width, about 240px tall on mobile and about 320px on desktop. Right-side % axis, dotted gridlines, x-axis dates, and an end dot with a soft glow.
   - On load the line **draws in left→right (~800ms)** and the % **counts up** to its value.
   - Multi-candidate: one line per candidate in its permanent palette colour. Show the **top 4** by default; tapping a legend item toggles it.
   - Touch-drag/hover shows a crosshair and tooltip (date + each visible candidate's %). It must not scroll the page sideways (`touch-action: pan-y`).
   - Data comes from `outcome_price_history`, downsampled per range.
4. **Stats row:** "UGX X Vol.", 🕐 end date, range tabs 1H 6H 1D 1W 1M ALL (scroll horizontally if needed), shuffle/settings icons.
5. **Outcomes list (multi-candidate):** sorted by %. Line 1: avatar + name (ellipsis) + big % + ▲/▼ change badge. Line 2: full-width Yes (green tint) and No (red tint) buttons with prices. A collapsible "Hide resolved ^" section lists eliminated candidates with "No ⊗" or "Yes ✓".
6. **Rules card (collapsible):** "ⓘ Additional context" box with "Updated <date>", the full rules, "Created At", a Resolver card, and image credits where the licence requires them.
7. **Related:** filter tabs (All + this market's categories), then rows with a 56px image, a 2-line title, and a tiny sparkline of the main outcome on the right ("—" if there's no history).
8. **Comments:** tab with accent underline; input with image/sticker/send icons; full-width "🛡 Beware of external links" pill; "Newest ▾" + "Holders" checkbox; empty state; skeletons.
9. **FAQ accordion.**
10. **Sticky buy bar (mobile only):** "Buy Yes" (green tint) and "Buy No" (red tint). On multi-candidate markets, the selected candidate's name sits above the buttons. On desktop, the right panel replaces it.

---

## PHASE 6: Trade sheet / panel and sign-in

**Trade component**: a single component. On mobile it is a bottom sheet; on desktop (≥1024px) it is the sticky right-column panel.
- **Sheet behaviour:** spring slide-up, drag handle, rounded top corners, dark backdrop. Closes on swipe-down, backdrop tap or the Back button (push a history state). Max height 90dvh, scrolls internally.
- **Top:** outcome avatar, market title (1 line, ellipsis), selected candidate under it, and "Bal. ****" on the right (tap to reveal).
- A "Buy" tab with accent underline and verified badge.
- YES / NO buttons with multipliers from our existing logic (e.g. "YES 7.41x"). The selected one is filled green/red; the other is `#1A1A1A`.
- **Amount:** "−" on the left, a big centred "UGX 0" (white once entered), "+" on the right. Chips +1K, +5K, +10K and MAX. A live "Potential payout: UGX X" from the **existing** payout logic.
- **Error slot** (reserved height): orange "⚠ message" + "Report issue" link, for not signed in, insufficient balance and below the minimum stake.
- **Slide to trade (mobile):** a pill track and round thumb holding "→". The track fills green behind the thumb. Releasing before ~90% springs it back. Reaching the end locks it, shows "Processing…" with a spinner, then a ✓ on success, or a shake + error on failure. Call `navigator.vibrate(10)` where supported. Keyboard and screen-reader users get a "Confirm trade" button.
- **Desktop:** a normal accent "Trade" button instead of the slider.
- Disclaimer: "Fixed return: your payout and odds are locked at the moment of execution."
- Tapping Yes/No anywhere (card, outcome row, buy bar) opens this with that outcome and side preselected.

**Sign-in modal:** shown when a logged-out user taps any Yes/No/Trade. Centred over a dimmed page. Contents: close ×; 3 rounded icon tiles (our sign-in method icons + the Sabula 256 logo); "Welcome to Sabula 256"; "Sign in to start trading"; two checkboxes ("I agree to the Terms of Use" with a link, "I confirm that I am 18 years old or above"); then the button(s) for **our existing auth method(s)**. The button stays disabled until both boxes are ticked. After sign-in, return the user to the exact trade they started (market, outcome, side, amount).

---

## PHASE 7: Home / feed

- A sub-filter pill row in a rounded container (All + subcategories), scrolling horizontally.
- A toolbar: search input (tinted, rounded, placeholder "Search Sabula"), time filter 🕐 ▾, filter button with count badge, and a saved/bookmark button. It must wrap cleanly at 320px.
- **Market card**
  - Top: 48px rounded image and a bold title clamped to 2 lines.
  - **Multi-candidate:** shows 2 rows at a time. Each row: name (ellipsis) | % (bold, tnum) | small "Yes" pill | small "No" pill. Every ~3s the rows **auto-slide up** to the next pair (transform + opacity, ~400ms ease) and loop through all candidates. Pause while the card is touched and while it is off-screen (IntersectionObserver). The user can swipe vertically within the rows area. The card height never changes.
  - **Binary:** a semicircle gauge top-right ("50%" / "chance"); the arc goes red→amber→green with probability and animates when the value changes. Full-width Yes / No buttons sit below.
  - **Footer:** "UGX 23.8M Vol.", 🔥 if trending, ⟳ Daily/Monthly/Annual if recurring; on the right: verified badge, optional "+", bookmark.
  - Yes/No opens the trade sheet preselected; tapping anywhere else opens the market page.
- Grid: 1 column on mobile, 2 on tablet, 3–4 on desktop.
- Infinite scroll with skeleton cards that exactly match the card dimensions. A good empty state.

---

## PHASE 8: Automatic images (server-side only)

Build a resolver that runs when a market or candidate is created, plus a one-off **backfill script**. Never fetch images from the browser and never hotlink.
- **Classify** each item as PERSON (candidate, player, politician, artist) or GENERAL (place, event, item, concept, team).
- **PERSON:** Wikipedia REST `page/summary` thumbnail, or Wikidata P18 via Wikimedia Commons. Verify it is a human (Wikidata P31 = Q5) and the right person, using market context for disambiguation (e.g. "Ugandan politician", "footballer"). Prefer a portrait crop.
- **GENERAL:** try Wikipedia first, then Unsplash or Pexels with keywords from the market title (`UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` from env; skip this step if neither is set).
- **Country-level / country-vs-country:** use flag images.
- Download, resize to **256×256 WebP + 64×64 WebP**, store in **our** storage, and save the url, source and credit/licence on the row. Show credit where the licence requires it.
- **Fallback:** a generated initials-on-gradient avatar (gradient derived from the name), and set `image_needs_review = true`, shown in admin.
- **Admin overrides always win:** the resolver never replaces an image where `image_override = true`.
- Cache lookups, respect rate limits and terms, and send a descriptive User-Agent to Wikimedia.
- Images **fade in** over their reserved placeholder.

---

## PHASE 9: QA (fix everything you find)

- Use the device emulator / Playwright at **320, 360, 375, 390, 412, 430, 768, 1024 and 1440px**, for the feed, a binary market, a multi-candidate market with 2 candidates and one with 12+, the trade sheet open, and the sign-in modal open. Test both short and very long titles and names.
- At each width, verify with a script: `document.documentElement.scrollWidth <= window.innerWidth`, no overlapping fixed bars, and the last item visible above the buy bar + bottom nav. Save screenshots to `design-ref/qa/`.
- Compare your screenshots side by side with the reference images and close any visible differences in spacing, sizing or hierarchy.
- Check: no white flash, reduced-motion works, keyboard navigation works in the sheet and modal, and CLS ≈ 0 on the market page.
- Typecheck, lint and build all pass.

---

## FINAL REPORT

Report:
- Files created, changed and deleted.
- Migrations added.
- Env vars needed (`UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `WIKIMEDIA_USER_AGENT`, storage vars).
- How to run the image backfill.
- QA results per width.
- Anything unfinished or that needs my decision.
