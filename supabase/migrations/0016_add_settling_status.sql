-- Add 'settling' to markets status check constraint.
-- settle-market.ts uses this as an atomic in-progress lock to prevent
-- double-payout under concurrent settlement requests. The status was
-- in the code but missing from the DB constraint, causing every settle to fail.
ALTER TABLE public.markets DROP CONSTRAINT markets_status_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_status_check
  CHECK (status = ANY (ARRAY[
    'pending_approval'::text,
    'open'::text,
    'closed'::text,
    'settling'::text,
    'settled'::text,
    'cancelled'::text,
    'suspended'::text
  ]));
