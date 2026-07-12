-- Atomic rate limiter using advisory lock to prevent TOCTOU race condition.
-- Replaces the non-atomic count-then-insert pattern in rate-limit.ts.
CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_key text,
  p_limit int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Advisory lock serialises concurrent calls for the same key.
  -- Transaction-scoped: released automatically on commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  -- Prune expired entries for this key
  DELETE FROM public.rate_limit_log
  WHERE key = p_key
    AND created_at < NOW() - (p_window_seconds || ' seconds')::interval;

  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_log
  WHERE key = p_key;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_log (key) VALUES (p_key);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, int, int) TO service_role;
