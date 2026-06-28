# Market Intelligence — Implementation Plan

## Schema Adaptation Notes
The prompt was written for a different schema. Real schema:
- Pool lives in `options JSONB` array (`[{id, label, total_pool}]`) — NOT `yes_pool`/`no_pool` columns
- Money is `numeric(12,2)`, not BIGINT — using JS `number` (no floats on payouts, use `Math.round`)
- Next.js 14 API routes, not Supabase Edge Functions
- `profiles` + `wallets` tables; `closes_at` not `betting_closes_at`
- Early exit already exists at 85% — upgrading to 10% fee (90% refund) per spec

## Migration: 0007_market_intelligence.sql
- [x] Add `last_bet_at`, `probability_at_close`, `surge_flag` to markets
- [x] Add 'suspended' to markets status constraint
- [x] Trigger: update `last_bet_at` on bets insert
- [x] `pool_depth_snapshots` table
- [x] `market_events` table
- [x] `account_flags` table
- [x] `audit_log` table with RLS
- [x] Add `exited_at`, `exit_fee_paid` to bets
- [x] Add 'exit_fee' to transaction types

## Integration 1 — Live Probability (GET /api/market/[id]/odds)
- [x] Returns probability, pool depth rating, payout estimates, bettor count, last_bet_at
- [x] Realtime already wired in BetPanel (subscribes to markets table changes)

## Integration 2 — Pool Depth Indicator
- [x] poolDepth() helper in src/lib/pool-depth.ts
- [x] Pool depth badge on MarketCard
- [x] Pool depth warning in BetPanel bet slip

## Integration 3 — Payout Preview (POST /api/market/[id]/preview)
- [x] Read-only preview endpoint
- [x] BetPanel: debounced preview on stake change, show return/profit/ROI/shift
- [x] Warning when shift > 5% or thin pool

## Integration 4 — Surge Guard
- [x] GET /api/cron/surge-check (called by Vercel cron)
- [x] Detects 15–39% pool shift in last 15 min → surge_flag + account_flag
- [x] Detects ≥40% shift → suspend market

## Integration 5 — Bet Placement Guards
- [x] Updated /api/bet/place with 7 guards in order
- [x] Structured error objects {code, message, ...}

## Integration 6 — Early Exit Fee
- [x] Updated /api/bet/exit: 10% fee, 90% refund
- [x] Track exited_at + exit_fee_paid on bets
- [x] Updated bets page to show 90% / 10% fee breakdown

## Admin additions
- [x] GET /api/admin/market-events
- [x] GET /api/admin/account-flags
- [x] POST /api/admin/account-flags/[id]/resolve
- [x] POST /api/admin/market/[id]/clear-surge
- [x] Admin market events feed page
- [x] Admin account flags page

## Vercel cron config
- [x] vercel.json: surge-check every 5 min
