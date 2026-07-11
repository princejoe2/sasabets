# Sabula 256 — Intro Video Design Spec
**Date:** 2026-07-11
**Tool:** Remotion (React-based video)
**Output:** MP4, 1920×1080, 30fps, 18 seconds (540 frames)

---

## Purpose

A hero video for sabula256.com that explains what Sabula 256 is and how it works to first-time visitors. Goal: educate, not just hype. Visitor should leave the video knowing: this is a prediction market, you pick outcomes, you win real money via MTN/Airtel.

---

## Scene Structure

| # | Scene | Frames | Duration | Description |
|---|-------|--------|----------|-------------|
| 1 | Logo Intro | 0–60 | 0–2s | Sabula 256 wordmark fades in from centre on deep black background. Violet (#7c3aed) neon glow pulses outward once. |
| 2 | Market Card Reveal | 60–180 | 2–6s | A dark card (matches site UI) springs up from bottom. Title: "🏆 Will Argentina win the World Cup?" Two buttons: YES (violet) and NO (slate). Pool stat: "UGX 245,000 in the pool". Label overlay (top-left): "Pick a market". |
| 3 | Live Odds Animate | 180–300 | 6–10s | Two probability bars fill left-to-right: YES 68%, NO 32%. Pool counter ticks up from 0 to 245,000. Label overlay: "See live odds". |
| 4 | Bet Placement | 300–420 | 10–14s | Amount field typewriters in "UGX 10,000". YES button pulses with violet glow. "BET PLACED ✓" stamps in from centre with spring bounce. Label overlay: "Place your prediction". |
| 5a | Phone Payout | 420–480 | 14–16s | Smartphone frame slides in from right. MTN MoMo SMS notification animates in: "You have received UGX 28,500 from Sabula 256. New balance: UGX 38,500." Screen glow effect. |
| 5b | CTA | 480–540 | 16–18s | Phone fades out. sabula256.com domain fades in (large, white). MTN + Airtel logos appear side by side beneath it. Tagline: "Uganda's prediction market". |

---

## Voiceover Script

Timed to scenes, ~18 seconds total:

> "Sabula 256 — Uganda's prediction market.
> Pick a live market. Place your prediction.
> Win real money, straight to your MTN or Airtel.
> Join the smartest predictors in Uganda — sabula256.com."

Audio: voiceover layered over a low-energy electronic/atmospheric background track.

---

## Visual Style

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` (near-black, matches site) |
| Primary accent | `#7c3aed` (violet-600) |
| Neon glow | `#a78bfa` with `blur(20px)` |
| Text primary | `#ffffff` |
| Text secondary | `#94a3b8` (slate-400) |
| YES button | violet filled |
| NO button | slate border, dark fill |
| SMS bubble | white on `#1a1a2e`, rounded corners |
| MTN colour | `#ffcc00` |
| Airtel colour | `#e4002b` |

Font: Inter (or Geist if available via staticFile). Scene labels in `text-xs uppercase tracking-widest` style.

---

## Remotion Project Structure

```
sabula-intro/              ← Remotion project root (Blank template)
  src/
    Root.tsx               ← Registers SabulaIntro composition
    SabulaIntro.tsx        ← Master timeline using <Sequence>
    scenes/
      LogoIntro.tsx        ← Scene 1
      MarketCard.tsx       ← Scene 2
      LiveOdds.tsx         ← Scene 3
      BetPlacement.tsx     ← Scene 4
      PhonePayout.tsx      ← Scene 5 (phone + SMS)
      CTA.tsx              ← Scene 5 tail (domain + logos)
    lib/
      colors.ts            ← Brand tokens
      fonts.ts             ← Font loading via staticFile
  public/
    mtn-logo.svg           ← MTN logo asset
    airtel-logo.svg        ← Airtel logo asset
    sabula-logo.svg        ← Sabula 256 wordmark (from existing public/)
    voiceover.mp3          ← Recorded voiceover (added post-build)
    bg-music.mp3           ← Background track (royalty-free)
```

---

## Composition Config

```ts
// Root.tsx
registerRoot(() => (
  <Composition
    id="SabulaIntro"
    component={SabulaIntro}
    durationInFrames={540}
    fps={30}
    width={1920}
    height={1080}
  />
))
```

---

## Animation Approach

- **Entrances:** `spring({ frame, fps, config: { damping: 14, stiffness: 100 } })`
- **Bar fills:** `interpolate(frame, [start, end], [0, targetPct], { extrapolateRight: 'clamp' })`
- **Counter tick:** `Math.floor(interpolate(frame, [start, end], [0, 245000], { extrapolateRight: 'clamp' }))`
- **Glow pulse:** `interpolate(frame, [0, 15, 30], [0, 1, 0])` on box-shadow opacity
- **Typewriter:** character slice on `Math.floor(interpolate(frame, ...))`
- **Phone slide-in:** `translateX` spring from `+300px` to `0`
- **SMS drop:** `translateY` spring from `-40px` to `0` with slight delay

No external animation libraries — pure Remotion primitives throughout.

---

## Phone Frame (Scene 5)

Render a simplified smartphone silhouette in JSX (rounded rect, notch, screen area). The SMS bubble inside the screen:

```
┌─────────────────────────────┐
│  MTN Mobile Money           │
│  ─────────────────────────  │
│  You have received          │
│  UGX 28,500 from            │
│  Sabula 256.                │
│  New balance: UGX 38,500.   │
│                   10:47 AM  │
└─────────────────────────────┘
```

The video uses MTN branding (yellow, most common in Uganda). Airtel variant is out of scope — can be rendered as a separate composition later.

---

## Render & Export

```bash
# Preview in browser (Remotion Studio)
npx remotion studio

# Render to MP4
npx remotion render SabulaIntro out/sabula-intro.mp4 --codec h264

# Render with audio (once voiceover is recorded)
npx remotion render SabulaIntro out/sabula-intro-final.mp4 --codec h264
```

---

## Out of Scope

- Responsive/mobile video sizes (can be added later as separate compositions)
- Real app screen recordings (all UI is recreated in React/JSX)
- Subtitles/captions (can be added post-export in a video editor)
- A/B variants (single version for now)
