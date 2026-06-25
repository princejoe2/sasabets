-- 1. Replace the partial unique index (WHERE reference IS NOT NULL) with a plain
--    unconditional unique index so that Supabase upsert's ON CONFLICT (reference)
--    can actually target it (partial indexes require a matching predicate in the
--    ON CONFLICT clause, which PostgREST doesn't support).
DROP INDEX IF EXISTS public.transactions_reference_key;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_key
  ON public.transactions (reference);

-- 2. Add 'rake' to the allowed transaction types.
--    The original schema only had deposit/withdrawal/bet/payout/refund.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake'));

-- 3. Add 'settling' and 'cancelled' to markets status.
--    settle-market.ts does an atomic CAS update to 'settling' first to prevent
--    double-settlement under concurrency. The original constraint only had
--    open/closed/settled so this update was silently rejected.
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_status_check;

ALTER TABLE public.markets
  ADD CONSTRAINT markets_status_check
  CHECK (status IN ('open', 'closed', 'settling', 'settled', 'cancelled'));
