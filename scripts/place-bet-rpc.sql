-- Run this in Supabase SQL Editor
-- Consolidates 8-10 sequential DB calls into one atomic stored procedure.

CREATE OR REPLACE FUNCTION place_bet(
  p_user_id   UUID,
  p_market_id UUID,
  p_option_id TEXT,
  p_amount    BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile          RECORD;
  v_market           RECORD;
  v_option           JSONB;
  v_new_balance      NUMERIC;
  v_account_age_s    NUMERIC;
  v_recent_bets      INT;
  v_global_recent    INT;
  v_user_existing    NUMERIC;
  v_opt_pool         NUMERIC;
  v_side_pool_after  NUMERIC;
  v_user_share       NUMERIC;
  v_updated_options  JSONB;
  v_new_total        NUMERIC;
  v_rake             NUMERIC;
  v_potential_payout NUMERIC;
  v_idempotency_key  TEXT;
BEGIN
  -- 2-second idempotency window: concurrent duplicate requests get same key,
  -- second INSERT hits the UNIQUE constraint and triggers EXCEPTION block.
  v_idempotency_key := p_user_id::TEXT || ':' || p_market_id::TEXT || ':' ||
                       p_option_id || ':' || floor(extract(epoch FROM now()) / 2)::TEXT;

  -- ── Guard 1: Profile ─────────────────────────────────────────────────────
  SELECT suspended, self_excluded_until, created_at
  INTO   v_profile
  FROM   profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found', 'message', 'User profile not found');
  END IF;

  IF v_profile.suspended THEN
    RETURN jsonb_build_object('error', 'suspended', 'message', 'Your account has been suspended. Contact support.');
  END IF;

  IF v_profile.self_excluded_until IS NOT NULL AND v_profile.self_excluded_until > NOW() THEN
    RETURN jsonb_build_object('error', 'self_excluded', 'message', 'You have self-excluded from betting.');
  END IF;

  -- ── Guard 2: Market ──────────────────────────────────────────────────────
  SELECT id, status, closes_at, options, total_pool, rake_pct, surge_flag
  INTO   v_market
  FROM   markets WHERE id = p_market_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'market_not_found', 'message', 'Market not found');
  END IF;

  IF v_market.status = 'suspended' THEN
    RETURN jsonb_build_object('error', 'market_suspended', 'message', 'This market is temporarily suspended pending review');
  END IF;

  IF v_market.status <> 'open' THEN
    RETURN jsonb_build_object('error', 'market_not_open', 'message', 'This market is not accepting bets', 'status', v_market.status);
  END IF;

  IF v_market.closes_at IS NOT NULL AND v_market.closes_at <= NOW() THEN
    RETURN jsonb_build_object('error', 'betting_closed', 'message', 'Betting on this market has closed');
  END IF;

  -- ── Guard 3: Option ──────────────────────────────────────────────────────
  SELECT elem INTO v_option
  FROM   jsonb_array_elements(v_market.options) AS elem
  WHERE  elem->>'id' = p_option_id
  LIMIT  1;

  IF v_option IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_option', 'message', 'Invalid option');
  END IF;

  -- ── Guard 4: Account age ─────────────────────────────────────────────────
  v_account_age_s := extract(epoch FROM (NOW() - v_profile.created_at));
  IF v_account_age_s < 259200 AND p_amount > 50000 THEN   -- 72 h = 259 200 s
    RETURN jsonb_build_object('error', 'account_too_new',
      'message', 'New accounts are limited to UGX 50,000 per bet for 72 hours',
      'max_allowed', 50000);
  END IF;

  -- ── Guard 5 & 6: Pool limits (only when pool > 500k) ────────────────────
  IF v_market.total_pool > 500000 THEN
    v_opt_pool := (v_option->>'total_pool')::NUMERIC;

    SELECT COALESCE(SUM(amount), 0) INTO v_user_existing
    FROM   bets
    WHERE  user_id = p_user_id AND market_id = p_market_id
      AND  option_id = p_option_id AND status = 'active';

    v_side_pool_after := v_opt_pool + p_amount;
    v_user_share      := (v_user_existing + p_amount) / v_side_pool_after;

    IF v_user_share > 0.20 THEN
      RETURN jsonb_build_object('error', 'position_limit',
        'message', 'You cannot hold more than 20% of one side of a market',
        'max_additional_allowed', GREATEST(0, floor(v_side_pool_after * 0.20) - v_user_existing::BIGINT));
    END IF;

    IF p_amount > floor(v_market.total_pool * 0.15) THEN
      RETURN jsonb_build_object('error', 'bet_too_large',
        'message', 'Single bet cannot exceed 15% of the current pool',
        'max_allowed', floor(v_market.total_pool * 0.15)::BIGINT);
    END IF;
  END IF;

  -- ── Guard 7: Velocity (5 bets / hour / market) ───────────────────────────
  SELECT COUNT(*) INTO v_recent_bets
  FROM   bets
  WHERE  user_id = p_user_id AND market_id = p_market_id
    AND  placed_at >= NOW() - INTERVAL '1 hour';

  IF v_recent_bets >= 5 THEN
    RETURN jsonb_build_object('error', 'too_many_bets',
      'message', 'You have placed too many bets on this market recently. Please wait before placing another.',
      'retry_after_minutes', 15);
  END IF;

  -- ── Guard 8: Global rate (20 bets / 5 min) ──────────────────────────────
  SELECT COUNT(*) INTO v_global_recent
  FROM   bets
  WHERE  user_id = p_user_id AND placed_at >= NOW() - INTERVAL '5 minutes';

  IF v_global_recent >= 20 THEN
    RETURN jsonb_build_object('error', 'global_rate_limit',
      'message', 'Too many bets placed. Please wait a few minutes.');
  END IF;

  -- ── Execute: atomic wallet debit ─────────────────────────────────────────
  -- Single UPDATE: checks balance AND debits in one statement — eliminates
  -- the read-then-write race that adjust_wallet_balance has at high concurrency.
  UPDATE wallets
  SET    balance = balance - p_amount, updated_at = NOW()
  WHERE  user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'insufficient_balance', 'message', 'Insufficient balance');
  END IF;

  -- ── Execute: update market pool ──────────────────────────────────────────
  SELECT jsonb_agg(
    CASE WHEN elem->>'id' = p_option_id
      THEN jsonb_set(elem, '{total_pool}', to_jsonb((elem->>'total_pool')::NUMERIC + p_amount))
      ELSE elem
    END
  )
  INTO  v_updated_options
  FROM  jsonb_array_elements(v_market.options) AS elem;

  v_new_total := v_market.total_pool + p_amount;
  v_rake      := COALESCE((v_market.rake_pct)::NUMERIC, 0.08);
  v_potential_payout :=
    ((v_new_total * (1 - v_rake)) / ((v_option->>'total_pool')::NUMERIC + p_amount)) * p_amount;

  UPDATE markets
  SET    options = v_updated_options, total_pool = v_new_total
  WHERE  id = p_market_id;

  -- ── Execute: insert bet (idempotency key guards concurrent duplicates) ───
  INSERT INTO bets (user_id, market_id, option_id, amount, potential_payout, status, placed_at, idempotency_key)
  VALUES (p_user_id, p_market_id, p_option_id, p_amount, v_potential_payout, 'active', NOW(), v_idempotency_key);

  -- ── Execute: record transaction ──────────────────────────────────────────
  INSERT INTO transactions (user_id, type, amount, balance_after, status, metadata)
  VALUES (p_user_id, 'bet', -p_amount, v_new_balance, 'completed',
    jsonb_build_object('marketId', p_market_id, 'optionId', p_option_id));

  RETURN jsonb_build_object(
    'success',          true,
    'new_balance',      v_new_balance,
    'new_total',        v_new_total,
    'updated_options',  v_updated_options,
    'potential_payout', v_potential_payout
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Idempotency key conflict: duplicate concurrent request within 2-second window.
    -- Postgres automatically rolls back wallet debit + market update to the savepoint.
    RETURN jsonb_build_object('error', 'duplicate_request',
      'message', 'Duplicate request — your bet was already placed');
END;
$$;
