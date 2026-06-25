-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- Applies migrations 0002–0006 in order.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ── 0002: Fix indexes + add rake/settling/cancelled types ──

DROP INDEX IF EXISTS public.transactions_reference_key;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_key ON public.transactions (reference);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake'));

ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_status_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_status_check
  CHECK (status IN ('open', 'closed', 'settling', 'settled', 'cancelled'));

-- ── 0003: Referral program ──

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

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

UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

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

CREATE TABLE IF NOT EXISTS public.referral_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id   uuid NOT NULL REFERENCES public.profiles(id),
  referred_id   uuid NOT NULL REFERENCES public.profiles(id),
  bonus_amount  numeric(12,2) NOT NULL DEFAULT 2000,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_events_referred_id_key ON public.referral_events (referred_id);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referral_events' AND policyname='Referrers see own events') THEN
    CREATE POLICY "Referrers see own events" ON public.referral_events FOR SELECT USING (auth.uid() = referrer_id);
  END IF;
END $$;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake', 'referral_bonus'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- ── 0004: Bet early exit ──

ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_status_check;
ALTER TABLE public.bets ADD CONSTRAINT bets_status_check
  CHECK (status IN ('active', 'won', 'lost', 'refunded', 'exited'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake', 'referral_bonus', 'cashout'));

-- ── 0005: Market comments ──

CREATE TABLE IF NOT EXISTS public.market_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id  uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_comments_market_id_idx ON public.market_comments (market_id, created_at DESC);

ALTER TABLE public.market_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_comments' AND policyname='comments_read_all') THEN
    CREATE POLICY "comments_read_all"   ON public.market_comments FOR SELECT USING (true);
    CREATE POLICY "comments_insert_own" ON public.market_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "comments_delete_own" ON public.market_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Complaints table (from admin complaints feature) ──

CREATE TABLE IF NOT EXISTS public.complaints (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject    text NOT NULL,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='complaints' AND policyname='users view own complaints') THEN
    CREATE POLICY "users view own complaints" ON public.complaints FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "users insert own complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 0006: Uganda markets ──

INSERT INTO public.markets (title, description, options, status, closes_at, metadata)
VALUES
(
  'Will Kizza Besigye be released from detention by end of July 2026?',
  'Dr. Kizza Besigye has been in military detention since November 2024. Will he be released before 1 August 2026?',
  '[{"id":"yes","label":"Yes — released"},{"id":"no","label":"No — still detained"}]'::jsonb,
  'open', '2026-07-31 21:00:00+03', '{"category":"politics"}'::jsonb
),
(
  'Will Kampala Mayor Lukwago run for President in 2026?',
  'Erias Lukwago has been vocal about the 2026 election. Will he officially file as a presidential candidate before the nomination deadline?',
  '[{"id":"yes","label":"Yes — files candidacy"},{"id":"no","label":"No — does not run"}]'::jsonb,
  'open', '2026-09-30 21:00:00+03', '{"category":"politics"}'::jsonb
),
(
  'Will Uganda Cranes qualify for AFCON 2027?',
  'Uganda Cranes face qualifying matches in 2026. Will they qualify for the Africa Cup of Nations 2027?',
  '[{"id":"yes","label":"Yes — qualify"},{"id":"no","label":"No — eliminated"}]'::jsonb,
  'open', '2026-11-15 21:00:00+03', '{"category":"football"}'::jsonb
),
(
  'Will Uganda''s Teen Cranes (U17) win the AFCON U17 2025 title?',
  'Uganda''s U17 national team is in the running. Will they lift the AFCON U17 trophy?',
  '[{"id":"yes","label":"Yes — champions"},{"id":"no","label":"No — don''t win"}]'::jsonb,
  'open', '2026-08-31 21:00:00+03', '{"category":"football"}'::jsonb
),
(
  'Will KCCA FC win the FUFA Big League title 2025/26?',
  'KCCA FC vs Vipers SC and other contenders for the 2025/26 FUFA Big League title.',
  '[{"id":"kcca","label":"KCCA FC"},{"id":"vipers","label":"Vipers SC"},{"id":"other","label":"Another club"}]'::jsonb,
  'open', '2026-08-15 21:00:00+03', '{"category":"football"}'::jsonb
),
(
  'Will the EACOP pipeline reach commercial operation before end of 2027?',
  'The East Africa Crude Oil Pipeline (Uganda–Tanzania) has faced delays. Will it begin commercial operations before 1 January 2028?',
  '[{"id":"yes","label":"Yes — operational by 2027"},{"id":"no","label":"No — delayed past 2027"}]'::jsonb,
  'open', '2027-01-01 00:00:00+03', '{"category":"infrastructure"}'::jsonb
),
(
  'Will Uganda''s UGX/USD rate exceed 4,000 by end of 2026?',
  'The Uganda Shilling has been under pressure. Will 1 USD cost more than UGX 4,000 before 31 December 2026?',
  '[{"id":"yes","label":"Yes — weakens past 4,000"},{"id":"no","label":"No — stays below 4,000"}]'::jsonb,
  'open', '2026-12-31 21:00:00+03', '{"category":"economy"}'::jsonb
),
(
  'Will Eddy Kenzo win at AFRIMMA 2026?',
  'Ugandan superstar Eddy Kenzo is a perennial favourite. Will he take home a major award at AFRIMMA 2026?',
  '[{"id":"yes","label":"Yes — wins an award"},{"id":"no","label":"No — doesn''t win"}]'::jsonb,
  'open', '2026-10-31 21:00:00+03', '{"category":"entertainment"}'::jsonb
),
(
  'Will Nyege Nyege Festival 2026 be held as planned in Jinja?',
  'Nyege Nyege is East Africa''s biggest electronic music festival. Will it take place as announced in September 2026 in Jinja?',
  '[{"id":"yes","label":"Yes — held as planned"},{"id":"no","label":"No — cancelled or moved"}]'::jsonb,
  'open', '2026-09-25 21:00:00+03', '{"category":"entertainment"}'::jsonb
),
(
  'Will Uganda declare the current Ebola outbreak over by end of August 2026?',
  'Following recent Ebola alerts in Uganda. Will the Ministry of Health officially declare the outbreak over before 1 September 2026?',
  '[{"id":"yes","label":"Yes — declared over"},{"id":"no","label":"No — still active"}]'::jsonb,
  'open', '2026-08-31 21:00:00+03', '{"category":"default"}'::jsonb
)
ON CONFLICT DO NOTHING;
