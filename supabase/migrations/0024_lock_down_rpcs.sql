-- 0024 — lock down SECURITY DEFINER functions that were callable with the public anon key.
--
-- Found in the 2026-11-14 security audit. Postgres grants EXECUTE on new functions to
-- PUBLIC by default, and Supabase's default privileges also grant it to anon and
-- authenticated, so every function in the `public` schema is reachable at
-- POST /rest/v1/rpc/<name> unless it is explicitly revoked. Only adjust_wallet_balance
-- had been revoked (migration 0001).
--
--   place_bet(p_user_id, ...)  SECURITY DEFINER, trusts p_user_id, no auth.uid() check.
--                              Anyone could place bets out of ANY user's wallet, skip the
--                              UGX 1,000 minimum, and skip the private-market token check
--                              that /api/bet/place enforces.
--   rate_limit_check(...)      Anyone could fill another user's / IP's rate-limit bucket
--                              (lock them out of deposits, sign-up, etc.) or call it with
--                              their own limits.
--   generate_referral_code()   Also exposed, but harmless and used by the sign-up trigger, so it is
--                              deliberately left alone.
--
-- The app only ever calls these through the service-role client (src/lib/supabase/server.ts
-- createAdminClient), which keeps its access, so nothing in the site changes.

REVOKE ALL ON FUNCTION public.place_bet(uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bet(uuid, uuid, text, bigint) TO service_role;

REVOKE ALL ON FUNCTION public.rate_limit_check(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, int, int) TO service_role;
