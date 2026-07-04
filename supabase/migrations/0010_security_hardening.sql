-- 0010: Security hardening (applied directly to production 2026-07-04)
--
-- Removes RLS policies that let authenticated users write money-critical rows
-- directly through PostgREST with the anon key, bypassing the API guards:
--   * wallets UPDATE  → users could set their own balance to any value
--   * bets INSERT     → users could insert unpaid bets and collect payouts at settlement
--   * profiles UPDATE → unrestricted columns allowed self-granting is_admin,
--                       verified_creator, kyc_status, clearing suspension, etc.
-- Service-role code paths are unaffected (service role bypasses RLS and grants).

DROP POLICY IF EXISTS "Users update own wallet" ON wallets;
DROP POLICY IF EXISTS "Users insert own bets" ON bets;

-- These "service" insert policies had WITH CHECK (true), which actually granted
-- INSERT to *everyone* (the service role never needed them).
DROP POLICY IF EXISTS account_flags_insert_service ON account_flags;
DROP POLICY IF EXISTS market_events_insert_service ON market_events;
DROP POLICY IF EXISTS pool_depth_insert_service ON pool_depth_snapshots;
DROP POLICY IF EXISTS audit_log_insert_service ON audit_log;

-- Column-level lockdown: the only client-side profile write is the push_enabled
-- toggle on /profile. Everything else goes through API routes using the service role.
REVOKE UPDATE, INSERT, DELETE ON profiles FROM anon, authenticated;
GRANT UPDATE (push_enabled) ON profiles TO authenticated;

-- Defense in depth on money tables (no client-side writes exist).
REVOKE INSERT, UPDATE, DELETE ON wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON bets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON transactions FROM anon, authenticated;
