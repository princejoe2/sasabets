-- Add 'exited' to bets status (user cashed out before resolution)
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_status_check;
ALTER TABLE public.bets ADD CONSTRAINT bets_status_check
  CHECK (status IN ('active', 'won', 'lost', 'refunded', 'exited'));

-- Add 'cashout' to transaction types
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake', 'referral_bonus', 'cashout'));
