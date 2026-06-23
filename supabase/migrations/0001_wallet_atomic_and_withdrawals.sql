-- Security-audit migration for the withdrawal flow.
-- Run this against the Supabase project before deploying the patched API.

-- 1) Allow the 'processing' interim status used by webhook/poll idempotency claims.
--    (The original CHECK constraint only permitted pending/completed/failed, which
--     made every `update status='processing'` throw and silently break idempotency.)
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check
  check (status in ('pending', 'processing', 'completed', 'failed'));

-- 2) Prevent the same gateway reference from being recorded twice (defence in depth
--    against duplicate inserts / replayed webhooks creating duplicate ledger rows).
create unique index if not exists transactions_reference_key
  on public.transactions (reference)
  where reference is not null;

-- 3) Atomic, race-free wallet balance adjustment.
--    delta > 0 credits, delta < 0 debits. A debit only succeeds if it does not
--    drive the balance below zero. Returns the resulting balance, or NULL when the
--    debit would overdraw (caller treats NULL as "insufficient funds").
--    Using a single UPDATE ... RETURNING makes the read-modify-write atomic under
--    row locking, eliminating the TOCTOU / lost-update class of bugs that a
--    read-then-absolute-write pattern is vulnerable to.
create or replace function public.adjust_wallet_balance(p_user_id uuid, p_delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric;
begin
  update public.wallets
     set balance = balance + p_delta,
         updated_at = now()
   where user_id = p_user_id
     and balance + p_delta >= 0
  returning balance into new_balance;

  -- new_balance is NULL when no row matched (debit would overdraw, or no wallet)
  return new_balance;
end;
$$;

revoke all on function public.adjust_wallet_balance(uuid, numeric) from public, anon, authenticated;
