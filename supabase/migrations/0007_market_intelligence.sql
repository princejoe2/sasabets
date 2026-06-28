-- Market Intelligence: pool depth, surge guard, audit log, early exit tracking

-- 1. Add columns to markets
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS last_bet_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS probability_at_close NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS surge_flag        BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add 'suspended' to markets status constraint
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_status_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_status_check
  CHECK (status IN ('open', 'closed', 'settling', 'settled', 'cancelled', 'suspended'));

-- 3. Trigger: keep last_bet_at fresh on every new bet
CREATE OR REPLACE FUNCTION public.update_market_last_bet_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.markets SET last_bet_at = NOW() WHERE id = NEW.market_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_market_last_bet_at ON public.bets;
CREATE TRIGGER trg_market_last_bet_at
  AFTER INSERT ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.update_market_last_bet_at();

-- 4. Pool depth snapshots (hourly + milestone)
CREATE TABLE IF NOT EXISTS public.pool_depth_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id    UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  snapshot_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_pool   NUMERIC(12,2) NOT NULL,
  bettor_count INTEGER NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('hourly','threshold','manual'))
);

CREATE INDEX IF NOT EXISTS pool_depth_snapshots_market_id_idx
  ON public.pool_depth_snapshots (market_id, snapshot_at DESC);

ALTER TABLE public.pool_depth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pool_depth_read_all" ON public.pool_depth_snapshots
  FOR SELECT USING (true);
CREATE POLICY "pool_depth_insert_service" ON public.pool_depth_snapshots
  FOR INSERT WITH CHECK (true);

-- 5. Market events (surge, close, suspend, etc.)
CREATE TABLE IF NOT EXISTS public.market_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  event_data  JSONB,
  actor_type  TEXT NOT NULL DEFAULT 'system',
  actor_id    UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS market_events_market_id_idx
  ON public.market_events (market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS market_events_type_idx
  ON public.market_events (event_type, created_at DESC);

ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_events_read_admin" ON public.market_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "market_events_insert_service" ON public.market_events
  FOR INSERT WITH CHECK (true);

-- 6. Account flags (velocity, surge bets, new-account large bets, etc.)
CREATE TABLE IF NOT EXISTS public.account_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type    TEXT NOT NULL,
  market_id    UUID REFERENCES public.markets(id),
  details      JSONB,
  flagged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flagged_by   TEXT NOT NULL DEFAULT 'system',
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS account_flags_user_id_idx
  ON public.account_flags (user_id, flagged_at DESC);
CREATE INDEX IF NOT EXISTS account_flags_type_idx
  ON public.account_flags (flag_type, resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.account_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_flags_read_admin" ON public.account_flags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "account_flags_insert_service" ON public.account_flags
  FOR INSERT WITH CHECK (true);
CREATE POLICY "account_flags_update_admin" ON public.account_flags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 7. Audit log (immutable append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  action      TEXT NOT NULL,
  actor_id    UUID,
  actor_type  TEXT NOT NULL DEFAULT 'system',
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON public.audit_log (actor_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_insert_service" ON public.audit_log
  FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
-- UPDATE and DELETE intentionally have no policies — blocked for all roles

-- 8. Add exit-tracking columns to bets
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS exited_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_fee_paid NUMERIC(12,2);

-- 9. Add 'exit_fee' to transaction types
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'deposit', 'withdrawal', 'bet', 'payout', 'refund',
    'rake', 'referral_bonus', 'cashout', 'exit_fee'
  ));

-- 10. Backfill last_bet_at for existing markets
UPDATE public.markets m
SET last_bet_at = sub.latest
FROM (
  SELECT market_id, MAX(placed_at) AS latest
  FROM public.bets
  GROUP BY market_id
) sub
WHERE m.id = sub.market_id;
