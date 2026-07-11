# Sabula 256 Intro Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an 18-second Remotion video (1920×1080 @ 30fps) that explains Sabula 256 prediction markets to first-time website visitors, ending with an MTN MoMo payout notification on a phone screen.

**Architecture:** Six sequential `<Sequence>` components inside a master `SabulaIntro` composition. Each scene is a self-contained React component using only Remotion primitives (`spring`, `interpolate`, `useCurrentFrame`, `useVideoConfig`). All UI is React/JSX — no screen recordings.

**Tech Stack:** Remotion 4.x, React 18, TypeScript, `@remotion/google-fonts` (Inter)

## Global Constraints

- Composition ID: `SabulaIntro`
- Resolution: 1920 × 1080
- FPS: 30
- Total frames: 540 (18 seconds)
- Background: `#0a0a0f` (applied in root `SabulaIntro` div)
- Primary accent: `#7c3aed` (violet-600)
- No external animation libraries — only Remotion primitives
- Font: Inter via `@remotion/google-fonts/Inter`
- Project root: `C:\Users\Owner\sabula-intro` (created in Task 1)

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `src/index.ts` | Modify | Keep as-is (calls `registerRoot`) |
| `src/Root.tsx` | Replace | Register `SabulaIntro` composition (540 frames, 30fps, 1920×1080) |
| `src/SabulaIntro.tsx` | Create | Master timeline — six `<Sequence>` blocks |
| `src/lib/colors.ts` | Create | Brand colour tokens |
| `src/lib/fonts.ts` | Create | Inter font loaded via `@remotion/google-fonts` |
| `src/scenes/LogoIntro.tsx` | Create | Scene 1 (frames 0–60): wordmark + neon glow |
| `src/scenes/MarketCard.tsx` | Create | Scene 2 (frames 60–180): market card spring-in |
| `src/scenes/LiveOdds.tsx` | Create | Scene 3 (frames 180–300): probability bars + counter |
| `src/scenes/BetPlacement.tsx` | Create | Scene 4 (frames 300–420): typewriter + glow + stamp |
| `src/scenes/PhonePayout.tsx` | Create | Scene 5a (frames 420–480): phone frame + MTN SMS |
| `src/scenes/CTA.tsx` | Create | Scene 5b (frames 480–540): domain + payment logos |

---

### Task 1: Scaffold project + brand tokens

**Files:**
- Create: `C:\Users\Owner\sabula-intro\` (Remotion Blank project)
- Create: `src/lib/colors.ts`
- Create: `src/lib/fonts.ts`

**Interfaces:**
- Produces: `colors` object (used by all scene files), `fontFamily` string (used by all scene files)

- [ ] **Step 1: Complete the create-video wizard**

In the terminal where `npx create-video@latest` is running:
- Arrow-key to **Blank** and press Enter
- When prompted for project name, type: `sabula-intro`
- When prompted for package manager, choose `npm`
- Wait for install to complete

- [ ] **Step 2: Install Google Fonts package**

```bash
cd C:\Users\Owner\sabula-intro
npm install @remotion/google-fonts
```

Expected output: `added N packages` with no errors.

- [ ] **Step 3: Verify Remotion Studio opens**

```bash
npx remotion studio
```

Expected: browser opens at `http://localhost:3000` showing a Remotion Studio with an empty (black or default) composition. Close or leave running.

- [ ] **Step 4: Create `src/lib/colors.ts`**

```typescript
export const colors = {
  bg: '#0a0a0f',
  violet: '#7c3aed',
  violetLight: '#a78bfa',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  mtnYellow: '#ffcc00',
  airtelRed: '#e4002b',
  cardBg: '#13131a',
  cardBorder: '#1e1e2e',
  success: '#10b981',
} as const
```

- [ ] **Step 5: Create `src/lib/fonts.ts`**

```typescript
import { loadFont } from '@remotion/google-fonts/Inter'

const { fontFamily } = loadFont()
export { fontFamily }
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold sabula-intro Remotion project with brand tokens"
```

---

### Task 2: Root composition + master timeline skeleton

**Files:**
- Replace: `src/Root.tsx`
- Create: `src/SabulaIntro.tsx`

**Interfaces:**
- Consumes: `colors.bg` from `src/lib/colors.ts`, `fontFamily` from `src/lib/fonts.ts`
- Produces: `SabulaIntro` React component (consumed by `Root.tsx`), six `<Sequence>` slots for scene components

- [ ] **Step 1: Replace `src/Root.tsx`**

```typescript
import { Composition } from 'remotion'
import { SabulaIntro } from './SabulaIntro'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SabulaIntro"
        component={SabulaIntro}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
```

- [ ] **Step 2: Create `src/SabulaIntro.tsx` with placeholder scenes**

```typescript
import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { colors } from './lib/colors'
import { fontFamily } from './lib/fonts'

// Scenes (imported one by one as each task completes)
// import { LogoIntro } from './scenes/LogoIntro'
// import { MarketCard } from './scenes/MarketCard'
// import { LiveOdds } from './scenes/LiveOdds'
// import { BetPlacement } from './scenes/BetPlacement'
// import { PhonePayout } from './scenes/PhonePayout'
// import { CTA } from './scenes/CTA'

const Placeholder: React.FC<{ label: string }> = ({ label }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ color: colors.violetLight, fontSize: 48, fontFamily }}>{label}</div>
  </AbsoluteFill>
)

export const SabulaIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: colors.bg, fontFamily }}>
      <Sequence from={0} durationInFrames={60}>
        <Placeholder label="Scene 1 — Logo" />
      </Sequence>
      <Sequence from={60} durationInFrames={120}>
        <Placeholder label="Scene 2 — Market Card" />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <Placeholder label="Scene 3 — Live Odds" />
      </Sequence>
      <Sequence from={300} durationInFrames={120}>
        <Placeholder label="Scene 4 — Bet Placement" />
      </Sequence>
      <Sequence from={420} durationInFrames={60}>
        <Placeholder label="Scene 5a — Phone Payout" />
      </Sequence>
      <Sequence from={480} durationInFrames={60}>
        <Placeholder label="Scene 5b — CTA" />
      </Sequence>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Open Remotion Studio and verify**

```bash
npx remotion studio
```

In the browser: open the `SabulaIntro` composition. Scrub through the timeline (0–540 frames). Expected: six labelled placeholders appear sequentially on the dark background, each label switching at the correct frame. If the studio was already running it will hot-reload.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Root composition and SabulaIntro skeleton (540 frames)"
```

---

### Task 3: Scene 1 — LogoIntro (frames 0–60)

**Files:**
- Create: `src/scenes/LogoIntro.tsx`
- Modify: `src/SabulaIntro.tsx` (uncomment LogoIntro import + replace Placeholder)

**Interfaces:**
- Consumes: `colors`, `fontFamily`
- Produces: `LogoIntro` React component — self-contained, uses `useCurrentFrame` starting from 0

- [ ] **Step 1: Create `src/scenes/LogoIntro.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

export const LogoIntro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Main entrance spring (wordmark fades + scales in)
  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 30,
  })
  const opacity = interpolate(enter, [0, 1], [0, 1])
  const scale = interpolate(enter, [0, 1], [0.85, 1])

  // Neon glow pulse: peaks at frame 30, fades by frame 55
  const glowOpacity = interpolate(
    frame,
    [20, 35, 55],
    [0, 1, 0.3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // Tagline fades in slightly after wordmark
  const taglineOpacity = interpolate(
    frame,
    [18, 38],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily,
            fontSize: 112,
            fontWeight: 800,
            color: colors.textPrimary,
            letterSpacing: '-3px',
            textShadow: [
              `0 0 ${60 * glowOpacity}px ${colors.violetLight}`,
              `0 0 ${120 * glowOpacity}px ${colors.violet}`,
              `0 0 ${200 * glowOpacity}px ${colors.violet}`,
            ].join(', '),
          }}
        >
          SABULA 256
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily,
            fontSize: 26,
            fontWeight: 400,
            color: colors.violetLight,
            letterSpacing: '8px',
            marginTop: 12,
            textTransform: 'uppercase',
            opacity: taglineOpacity,
          }}
        >
          Uganda&apos;s Prediction Market
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into `src/SabulaIntro.tsx`**

Replace the Scene 1 block (uncomment import and swap Placeholder):

```typescript
import { LogoIntro } from './scenes/LogoIntro'

// inside SabulaIntro, replace first Sequence:
<Sequence from={0} durationInFrames={60}>
  <LogoIntro />
</Sequence>
```

- [ ] **Step 3: Verify in Remotion Studio**

Scrub to frame 0. Expected: dark background, SABULA 256 wordmark starts invisible.
Scrub to frame 20. Expected: wordmark fading in and scaling up.
Scrub to frame 35. Expected: full wordmark, maximum neon glow, tagline visible.
Scrub to frame 58. Expected: glow has dimmed to ~30%, static display.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/LogoIntro.tsx src/SabulaIntro.tsx
git commit -m "feat: add LogoIntro scene (frames 0-60)"
```

---

### Task 4: Scene 2 — MarketCard (frames 60–180, local 0–120)

**Files:**
- Create: `src/scenes/MarketCard.tsx`
- Modify: `src/SabulaIntro.tsx`

**Interfaces:**
- Consumes: `colors`, `fontFamily`
- Produces: `MarketCard` component — `useCurrentFrame()` returns 0 at the start of this scene because it is inside a `<Sequence>`

- [ ] **Step 1: Create `src/scenes/MarketCard.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

export const MarketCard: React.FC = () => {
  const frame = useCurrentFrame()   // 0–119 inside this Sequence
  const { fps } = useVideoConfig()

  // Card springs up from bottom
  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 100 },
    durationInFrames: 40,
  })
  const translateY = interpolate(enter, [0, 1], [220, 0])
  const cardOpacity = interpolate(enter, [0, 1], [0, 1])

  // "Pick a market" label fades in after card
  const labelOpacity = interpolate(
    frame,
    [25, 45],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {/* Scene label */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          color: colors.violetLight,
          opacity: labelOpacity,
        }}
      >
        Pick a market
      </div>

      {/* Market card */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${translateY}px)`,
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 24,
          padding: '52px 60px',
          width: 700,
          boxShadow: `0 0 80px rgba(124, 58, 237, 0.12), 0 32px 64px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Category badge */}
        <div
          style={{
            fontFamily,
            fontSize: 14,
            color: colors.violetLight,
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom: 24,
          }}
        >
          ⚽ Football · World Cup 2026
        </div>

        {/* Market title */}
        <div
          style={{
            fontFamily,
            fontSize: 38,
            fontWeight: 700,
            color: colors.textPrimary,
            lineHeight: 1.3,
            marginBottom: 40,
          }}
        >
          Will Argentina win<br />the World Cup 2026?
        </div>

        {/* YES / NO buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          <div
            style={{
              flex: 1,
              background: colors.violet,
              borderRadius: 14,
              padding: '22px 0',
              textAlign: 'center',
              fontFamily,
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            YES
          </div>
          <div
            style={{
              flex: 1,
              background: 'transparent',
              border: `2px solid ${colors.cardBorder}`,
              borderRadius: 14,
              padding: '22px 0',
              textAlign: 'center',
              fontFamily,
              fontSize: 24,
              fontWeight: 700,
              color: colors.textSecondary,
            }}
          >
            NO
          </div>
        </div>

        {/* Pool stat */}
        <div
          style={{
            fontFamily,
            fontSize: 17,
            color: colors.textSecondary,
            textAlign: 'center',
          }}
        >
          💰{' '}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            UGX 245,000
          </span>{' '}
          in the pool
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into `src/SabulaIntro.tsx`**

```typescript
import { MarketCard } from './scenes/MarketCard'

// replace Scene 2 Sequence:
<Sequence from={60} durationInFrames={120}>
  <MarketCard />
</Sequence>
```

- [ ] **Step 3: Verify in Remotion Studio**

Scrub to frame 60 (start of scene, local frame 0). Expected: dark background only.
Scrub to frame 80 (local 20). Expected: card partially risen from bottom, slightly transparent.
Scrub to frame 110 (local 50). Expected: card fully settled, "Pick a market" label visible.
Scrub to frame 178 (local 118). Expected: card static, all elements fully visible.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MarketCard.tsx src/SabulaIntro.tsx
git commit -m "feat: add MarketCard scene (frames 60-180)"
```

---

### Task 5: Scene 3 — LiveOdds (frames 180–300, local 0–120)

**Files:**
- Create: `src/scenes/LiveOdds.tsx`
- Modify: `src/SabulaIntro.tsx`

**Interfaces:**
- Consumes: `colors`, `fontFamily`
- Produces: `LiveOdds` component — re-renders the market card with animated probability bars and a ticking pool counter

- [ ] **Step 1: Create `src/scenes/LiveOdds.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

export const LiveOdds: React.FC = () => {
  const frame = useCurrentFrame()   // 0–119

  // Card fades in instantly (already "on screen" from prev scene)
  const cardOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Bars and counter animate from frame 12 to 85
  const progress = interpolate(frame, [12, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const yesPct = Math.round(68 * progress)
  const noPct = Math.round(32 * progress)
  const poolCount = Math.floor(interpolate(frame, [12, 85], [0, 245000], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))

  const labelOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {/* Scene label */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          color: colors.violetLight,
          opacity: labelOpacity,
        }}
      >
        See live odds
      </div>

      {/* Card */}
      <div
        style={{
          opacity: cardOpacity,
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 24,
          padding: '52px 60px',
          width: 700,
          boxShadow: `0 0 80px rgba(124, 58, 237, 0.12), 0 32px 64px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Category badge */}
        <div style={{ fontFamily, fontSize: 14, color: colors.violetLight, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 24 }}>
          ⚽ Football · World Cup 2026
        </div>

        {/* Title */}
        <div style={{ fontFamily, fontSize: 34, fontWeight: 700, color: colors.textPrimary, lineHeight: 1.3, marginBottom: 40 }}>
          Will Argentina win the World Cup 2026?
        </div>

        {/* YES bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily, fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>YES</span>
            <span style={{ fontFamily, fontSize: 18, fontWeight: 700, color: colors.violetLight }}>{yesPct}%</span>
          </div>
          <div style={{ background: colors.cardBorder, borderRadius: 6, height: 12, overflow: 'hidden' }}>
            <div
              style={{
                width: `${68 * progress}%`,
                background: `linear-gradient(90deg, ${colors.violet}, ${colors.violetLight})`,
                borderRadius: 6,
                height: '100%',
                transition: 'none',
              }}
            />
          </div>
        </div>

        {/* NO bar */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily, fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>NO</span>
            <span style={{ fontFamily, fontSize: 18, fontWeight: 600, color: colors.textSecondary }}>{noPct}%</span>
          </div>
          <div style={{ background: colors.cardBorder, borderRadius: 6, height: 12, overflow: 'hidden' }}>
            <div
              style={{
                width: `${32 * progress}%`,
                background: '#475569',
                borderRadius: 6,
                height: '100%',
              }}
            />
          </div>
        </div>

        {/* Pool counter */}
        <div style={{ fontFamily, fontSize: 17, color: colors.textSecondary, textAlign: 'center' }}>
          💰{' '}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            UGX {poolCount.toLocaleString('en-UG')}
          </span>{' '}
          in the pool
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into `src/SabulaIntro.tsx`**

```typescript
import { LiveOdds } from './scenes/LiveOdds'

<Sequence from={180} durationInFrames={120}>
  <LiveOdds />
</Sequence>
```

- [ ] **Step 3: Verify in Remotion Studio**

Scrub to frame 180 (local 0). Expected: quick flash of card fading in.
Scrub to frame 195 (local 15). Expected: bars beginning to fill, counter ticking.
Scrub to frame 265 (local 85). Expected: YES bar at 68%, NO bar at 32%, counter at 245,000.
Scrub to frame 299 (local 119). Expected: bars and counter static at final values.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/LiveOdds.tsx src/SabulaIntro.tsx
git commit -m "feat: add LiveOdds scene with animated probability bars (frames 180-300)"
```

---

### Task 6: Scene 4 — BetPlacement (frames 300–420, local 0–120)

**Files:**
- Create: `src/scenes/BetPlacement.tsx`
- Modify: `src/SabulaIntro.tsx`

**Interfaces:**
- Consumes: `colors`, `fontFamily`
- Produces: `BetPlacement` component — typewriter effect, button glow, stamp overlay

- [ ] **Step 1: Create `src/scenes/BetPlacement.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

const AMOUNT_TEXT = 'UGX 10,000'

export const BetPlacement: React.FC = () => {
  const frame = useCurrentFrame()   // 0–119
  const { fps } = useVideoConfig()

  const cardOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Typewriter: all chars appear between frame 10 and 50
  const charsShown = Math.floor(
    interpolate(frame, [10, 50], [0, AMOUNT_TEXT.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  )
  const showCursor = charsShown < AMOUNT_TEXT.length && frame >= 10

  // YES button glow: pulses between frame 55 and 80
  const glowIntensity = interpolate(
    frame,
    [55, 68, 80],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // "BET PLACED ✓" stamp springs in at frame 88
  const stampStart = 88
  const stampSpring = spring({
    frame: Math.max(0, frame - stampStart),
    fps,
    config: { damping: 10, stiffness: 220 },
    durationInFrames: 18,
  })
  const stampVisible = frame >= stampStart
  const stampScale = stampVisible ? interpolate(stampSpring, [0, 1], [0.4, 1]) : 0
  const stampOpacity = stampVisible ? interpolate(stampSpring, [0, 1], [0, 1]) : 0

  const labelOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {/* Scene label */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          color: colors.violetLight,
          opacity: labelOpacity,
        }}
      >
        Place your prediction
      </div>

      {/* Card */}
      <div
        style={{
          opacity: cardOpacity,
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 24,
          padding: '52px 60px',
          width: 700,
          position: 'relative',
          boxShadow: `0 0 80px rgba(124, 58, 237, 0.12), 0 32px 64px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Title */}
        <div style={{ fontFamily, fontSize: 28, fontWeight: 700, color: colors.textPrimary, marginBottom: 36, lineHeight: 1.3 }}>
          Will Argentina win the World Cup 2026?
        </div>

        {/* Amount field */}
        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 14,
            padding: '18px 24px',
            marginBottom: 20,
            background: '#0a0a0f',
          }}
        >
          <div style={{ fontFamily, fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Amount (UGX)</div>
          <div style={{ fontFamily, fontSize: 32, fontWeight: 700, color: colors.textPrimary, height: 40 }}>
            {AMOUNT_TEXT.slice(0, charsShown)}
            {showCursor && (
              <span style={{ opacity: 0.6 }}>|</span>
            )}
          </div>
        </div>

        {/* YES button with glow */}
        <div
          style={{
            background: colors.violet,
            borderRadius: 14,
            padding: '22px 0',
            textAlign: 'center',
            fontFamily,
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            boxShadow: [
              `0 0 ${50 * glowIntensity}px ${colors.violet}`,
              `0 0 ${100 * glowIntensity}px ${colors.violetLight}`,
            ].join(', '),
          }}
        >
          YES — Place Bet
        </div>

        {/* BET PLACED stamp overlay */}
        {stampVisible && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 10, 15, 0.72)',
              borderRadius: 24,
              opacity: stampOpacity,
            }}
          >
            <div
              style={{
                transform: `scale(${stampScale})`,
                border: `5px solid ${colors.success}`,
                borderRadius: 18,
                padding: '22px 44px',
                fontFamily,
                fontSize: 40,
                fontWeight: 800,
                color: colors.success,
                letterSpacing: '5px',
              }}
            >
              BET PLACED ✓
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into `src/SabulaIntro.tsx`**

```typescript
import { BetPlacement } from './scenes/BetPlacement'

<Sequence from={300} durationInFrames={120}>
  <BetPlacement />
</Sequence>
```

- [ ] **Step 3: Verify in Remotion Studio**

Scrub to frame 310 (local 10). Expected: amount typewriter begins, "U" appears.
Scrub to frame 350 (local 50). Expected: "UGX 10,000" fully typed, cursor gone.
Scrub to frame 368 (local 68). Expected: YES button at peak violet glow.
Scrub to frame 388 (local 88). Expected: "BET PLACED ✓" stamp beginning to spring in.
Scrub to frame 400 (local 100). Expected: stamp fully settled, green border, dark overlay.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BetPlacement.tsx src/SabulaIntro.tsx
git commit -m "feat: add BetPlacement scene with typewriter + stamp (frames 300-420)"
```

---

### Task 7: Scenes 5a + 5b — PhonePayout + CTA (frames 420–540)

**Files:**
- Create: `src/scenes/PhonePayout.tsx`
- Create: `src/scenes/CTA.tsx`
- Modify: `src/SabulaIntro.tsx`

**Interfaces:**
- Consumes: `colors`, `fontFamily`
- Produces: `PhonePayout` (frames 420–480, local 0–60) and `CTA` (frames 480–540, local 0–60)

- [ ] **Step 1: Create `src/scenes/PhonePayout.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

export const PhonePayout: React.FC = () => {
  const frame = useCurrentFrame()   // 0–59
  const { fps } = useVideoConfig()

  // Phone slides in from right
  const phoneSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90 },
    durationInFrames: 35,
  })
  const phoneX = interpolate(phoneSpring, [0, 1], [380, 0])
  const phoneOpacity = interpolate(phoneSpring, [0, 1], [0, 1])

  // SMS notification drops in from top at frame 22
  const smsDelay = 22
  const smsSpring = spring({
    frame: Math.max(0, frame - smsDelay),
    fps,
    config: { damping: 18, stiffness: 130 },
    durationInFrames: 22,
  })
  const smsY = frame >= smsDelay ? interpolate(smsSpring, [0, 1], [-50, 0]) : -200
  const smsOpacity = frame >= smsDelay ? interpolate(smsSpring, [0, 1], [0, 1]) : 0

  // Screen glow (MTN yellow) peaks when SMS appears
  const glowOpacity = interpolate(
    frame,
    [22, 38, 56],
    [0, 0.7, 0.25],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Phone outer shell */}
      <div
        style={{
          transform: `translateX(${phoneX}px)`,
          opacity: phoneOpacity,
          width: 340,
          height: 680,
          background: '#111118',
          borderRadius: 52,
          border: '8px solid #2a2a3e',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: [
            `0 0 ${80 * glowOpacity}px ${colors.mtnYellow}55`,
            '0 40px 80px rgba(0,0,0,0.6)',
          ].join(', '),
        }}
      >
        {/* Pill notch */}
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 90,
            height: 26,
            background: '#111118',
            borderRadius: 13,
            zIndex: 10,
          }}
        />

        {/* Status bar */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily,
            fontSize: 13,
            color: colors.textSecondary,
            zIndex: 5,
          }}
        >
          <span>10:47</span>
          <span>MTN UG ●●●●●</span>
        </div>

        {/* Screen background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #0d0d1a 0%, #111118 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 28,
          }}
        >
          {/* MTN MoMo SMS bubble */}
          <div
            style={{
              transform: `translateY(${smsY}px)`,
              opacity: smsOpacity,
              background: '#ffffff',
              borderRadius: 18,
              borderBottomLeftRadius: 4,
              padding: '20px 22px',
              width: '100%',
              maxWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {/* Sender chip */}
            <div
              style={{
                display: 'inline-block',
                background: '#1a1400',
                color: colors.mtnYellow,
                borderRadius: 6,
                padding: '4px 12px',
                fontFamily,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: '0.5px',
              }}
            >
              MTN Mobile Money
            </div>

            {/* Message body */}
            <div
              style={{
                fontFamily,
                fontSize: 15,
                color: '#1a1a2e',
                lineHeight: 1.6,
              }}
            >
              You have received{' '}
              <strong>UGX 28,500</strong> from{' '}
              <strong>Sabula 256</strong>.<br />
              New balance:{' '}
              <strong>UGX 38,500</strong>.
            </div>

            {/* Time */}
            <div
              style={{
                fontFamily,
                fontSize: 12,
                color: '#94a3b8',
                textAlign: 'right',
                marginTop: 12,
              }}
            >
              10:47 AM
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Create `src/scenes/CTA.tsx`**

```typescript
import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { colors } from '../lib/colors'
import { fontFamily } from '../lib/fonts'

export const CTA: React.FC = () => {
  const frame = useCurrentFrame()   // 0–59
  const { fps } = useVideoConfig()

  // Domain fades and scales in
  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 30,
  })
  const opacity = interpolate(enter, [0, 1], [0, 1])
  const scale = interpolate(enter, [0, 1], [0.88, 1])

  // Payment logos appear after domain (frame 22)
  const logoOpacity = interpolate(
    frame,
    [22, 42],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 40,
      }}
    >
      {/* Tagline + domain */}
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 22,
            letterSpacing: '5px',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          Uganda&apos;s Prediction Market
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 88,
            fontWeight: 800,
            color: colors.textPrimary,
            letterSpacing: '-2px',
          }}
        >
          sabula256.com
        </div>
      </div>

      {/* MTN + Airtel payment badges */}
      <div
        style={{
          opacity: logoOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            background: colors.mtnYellow,
            borderRadius: 10,
            padding: '10px 24px',
            fontFamily,
            fontSize: 20,
            fontWeight: 800,
            color: '#1a1400',
          }}
        >
          MTN MoMo
        </div>
        <div style={{ fontFamily, fontSize: 20, color: colors.textSecondary }}>+</div>
        <div
          style={{
            background: colors.airtelRed,
            borderRadius: 10,
            padding: '10px 24px',
            fontFamily,
            fontSize: 20,
            fontWeight: 800,
            color: '#ffffff',
          }}
        >
          Airtel Money
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Wire both scenes into `src/SabulaIntro.tsx`**

```typescript
import { PhonePayout } from './scenes/PhonePayout'
import { CTA } from './scenes/CTA'

<Sequence from={420} durationInFrames={60}>
  <PhonePayout />
</Sequence>
<Sequence from={480} durationInFrames={60}>
  <CTA />
</Sequence>
```

- [ ] **Step 4: Verify in Remotion Studio**

Scrub to frame 420 (local 0). Expected: dark screen, phone beginning to slide in from right.
Scrub to frame 445 (local 25). Expected: phone mostly settled, SMS bubble starting to drop.
Scrub to frame 460 (local 40). Expected: MTN MoMo SMS fully visible, screen glowing yellow.
Scrub to frame 480 (local 60 / CTA local 0). Expected: cuts to dark screen.
Scrub to frame 495 (CTA local 15). Expected: "sabula256.com" fading and scaling in.
Scrub to frame 510 (CTA local 30). Expected: domain fully visible, logos beginning to appear.
Scrub to frame 535 (CTA local 55). Expected: full CTA — domain, MTN + Airtel badges.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/PhonePayout.tsx src/scenes/CTA.tsx src/SabulaIntro.tsx
git commit -m "feat: add PhonePayout (MTN SMS) and CTA scenes (frames 420-540)"
```

---

### Task 8: Full timeline scrub + audio integration

**Files:**
- Modify: `src/SabulaIntro.tsx` (add `<Audio>` tags once assets are ready)
- Add: `public/voiceover.mp3` (recorded externally)
- Add: `public/bg-music.mp3` (royalty-free track)

**Interfaces:**
- Consumes: `voiceover.mp3` and `bg-music.mp3` in `public/`
- Produces: final renderable composition with synced audio

- [ ] **Step 1: Full scrub — verify complete timeline**

Open Remotion Studio. Play the full composition from frame 0 to 540. Check each scene transition:

| Transition | Frame | Expected |
|------------|-------|---------|
| Logo → Market Card | 60 | Instant cut to card springing in |
| Market Card → Live Odds | 180 | Instant cut, card fades in with bars at 0% |
| Live Odds → Bet Placement | 300 | Instant cut, amount field empty |
| Bet Placement → Phone | 420 | Instant cut, phone slides in from right |
| Phone → CTA | 480 | Instant cut, domain fades in |

- [ ] **Step 2: Record voiceover**

Record the following script (~16 seconds — allow 2 seconds of silence before first word, matches logo scene):

> "Sabula 256 — Uganda's prediction market.
> Pick a live market. Place your prediction.
> Win real money, straight to your MTN or Airtel.
> Join the smartest predictors in Uganda — sabula256.com."

Export as MP3, 44.1kHz. Save to `public/voiceover.mp3`.

- [ ] **Step 3: Add a royalty-free background track**

Download a royalty-free atmospheric/electronic track (e.g. from pixabay.com/music or freesound.org). Choose something ~60–90 BPM, minimal, no lyrics. Save to `public/bg-music.mp3`.

- [ ] **Step 4: Add audio to `src/SabulaIntro.tsx`**

Add these imports and audio elements inside `SabulaIntro`:

```typescript
import { Audio, staticFile } from 'remotion'

// inside the SabulaIntro return, after the opening <AbsoluteFill>:
<Audio src={staticFile('bg-music.mp3')} volume={0.18} />
<Audio src={staticFile('voiceover.mp3')} volume={1} startFrom={0} />
```

- [ ] **Step 5: Preview audio sync in Remotion Studio**

Play the composition. Verify:
- Voiceover line 1 ("Sabula 256...") plays during Logo scene (frames 0–60)
- Line 2 ("Pick a live market...") plays during Market Card / Live Odds (frames 60–300)
- Line 3 ("Win real money...") plays during Phone Payout (frames 420–480)
- Line 4 ("Join the smartest...") plays during CTA (frames 480–540)

If timing is off, adjust `startFrom` on the voiceover `<Audio>` tag (in frames, e.g. `startFrom={15}` delays by 0.5s).

- [ ] **Step 6: Render final MP4**

```bash
npx remotion render SabulaIntro out/sabula-intro.mp4 --codec h264
```

Expected output ends with: `Rendered SabulaIntro, writing video...` then `Done in Xs`. Output file: `out/sabula-intro.mp4`, ~5–15MB.

- [ ] **Step 7: Spot-check the rendered MP4**

Open `out/sabula-intro.mp4` in a media player. Verify:
- 18 seconds total duration
- No frame drops or stutters
- Audio audible and synced to visuals
- All six scenes play correctly

- [ ] **Step 8: Commit**

```bash
git add public/voiceover.mp3 public/bg-music.mp3 src/SabulaIntro.tsx
git commit -m "feat: add audio integration (voiceover + background music)"
```

---

## Render Commands Reference

```bash
# Live preview
npx remotion studio

# Render (no audio yet)
npx remotion render SabulaIntro out/sabula-intro.mp4 --codec h264

# Render with concurrency boost (faster on multi-core)
npx remotion render SabulaIntro out/sabula-intro.mp4 --codec h264 --concurrency 4

# Render specific frame range (useful for debugging a scene)
npx remotion render SabulaIntro out/scene3.mp4 --codec h264 --frames 180-300
```
