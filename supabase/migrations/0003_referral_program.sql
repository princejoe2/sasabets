-- 1. Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- 2. Function to generate a unique 7-char code (no confusable chars: 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  text;
  i     int;
  tries int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..7 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
    tries := tries + 1;
    IF tries > 200 THEN RAISE EXCEPTION 'Cannot generate unique referral code'; END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Backfill existing profiles
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- 4. Unique index on referral_code
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

-- 5. Trigger: auto-assign code when a new profile is created
CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_referral_code();

-- 6. referral_events — one row per referred user, prevents double-crediting the referrer
CREATE TABLE IF NOT EXISTS public.referral_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id   uuid NOT NULL REFERENCES public.profiles(id),
  referred_id   uuid NOT NULL REFERENCES public.profiles(id),
  bonus_amount  numeric(12,2) NOT NULL DEFAULT 5000,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_events_referred_id_key
  ON public.referral_events (referred_id);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers see own events" ON public.referral_events
  FOR SELECT USING (auth.uid() = referrer_id);

-- 7. Add 'referral_bonus' to transaction types and 'processing' to statuses
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake', 'referral_bonus'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
