-- ═══════════════════════════════════════════════════════════════
-- 0020: market_outcomes display table + outcome_price_history
-- Applied 2026-10-08. Does NOT modify place_bet RPC or markets.options JSONB.
-- market_outcomes is the display table; markets.options is the financial truth.
-- ═══════════════════════════════════════════════════════════════

-- ── TABLE: market_outcomes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_outcomes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   uuid        NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  slug        text        NOT NULL,
  name        text        NOT NULL,
  image_url   text,
  sort_order  int         NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','resolved_yes','resolved_no','eliminated')),
  color_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_outcomes_market
  ON public.market_outcomes(market_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_outcomes_slug
  ON public.market_outcomes(market_id, slug);

-- ── TABLE: outcome_price_history ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.outcome_price_history (
  id          bigserial   PRIMARY KEY,
  outcome_id  uuid        NOT NULL REFERENCES public.market_outcomes(id) ON DELETE CASCADE,
  probability numeric(6,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  recorded_at timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oph_outcome_time
  ON public.outcome_price_history(outcome_id, recorded_at DESC);

-- ── RLS (service_role writes; anon/authenticated read) ───────
ALTER TABLE public.market_outcomes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market_outcomes"
  ON public.market_outcomes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read outcome_price_history"
  ON public.outcome_price_history FOR SELECT TO anon, authenticated USING (true);

-- service_role bypasses RLS for writes (trigger + API)

-- ── TRIGGER: record probability snapshot on each bet ─────────
CREATE OR REPLACE FUNCTION public.record_outcome_price_after_bet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id  uuid;
  v_total      numeric;
  v_opts       jsonb;
  v_outcome    RECORD;
  v_opt_yes_id text;
  v_yes_pool   numeric;
  v_no_pool    numeric;
  v_sub_total  numeric;
  v_prob       numeric;
BEGIN
  v_market_id := NEW.market_id;

  SELECT total_pool, options INTO v_total, v_opts
    FROM public.markets WHERE id = v_market_id;

  IF v_total IS NULL OR v_total = 0 THEN
    RETURN NEW;
  END IF;

  FOR v_outcome IN
    SELECT id, slug FROM public.market_outcomes
    WHERE market_id = v_market_id AND status = 'active'
  LOOP
    IF v_outcome.slug IN ('yes','no','up','down') THEN
      -- Binary market: probability = this option's pool / total market pool
      SELECT COALESCE(SUM((elem->>'total_pool')::numeric), 0)
        INTO v_yes_pool
        FROM jsonb_array_elements(v_opts) AS elem
        WHERE elem->>'id' = v_outcome.slug;
      v_prob := CASE WHEN v_total > 0 THEN v_yes_pool / v_total ELSE 0.5 END;
    ELSE
      -- Multi-candidate: probability = YES pool / (YES+NO sub-pool)
      v_opt_yes_id := v_outcome.slug || '_yes';
      SELECT COALESCE(SUM((elem->>'total_pool')::numeric), 0)
        INTO v_yes_pool
        FROM jsonb_array_elements(v_opts) AS elem
        WHERE elem->>'id' = v_opt_yes_id;
      SELECT COALESCE(SUM((elem->>'total_pool')::numeric), 0)
        INTO v_no_pool
        FROM jsonb_array_elements(v_opts) AS elem
        WHERE elem->>'id' = v_outcome.slug || '_no';
      v_sub_total := v_yes_pool + v_no_pool;
      v_prob := CASE WHEN v_sub_total > 0 THEN v_yes_pool / v_sub_total ELSE 0.5 END;
    END IF;

    INSERT INTO public.outcome_price_history (outcome_id, probability, recorded_at)
    VALUES (v_outcome.id, v_prob, NOW());
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_outcome_price
  AFTER INSERT ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.record_outcome_price_after_bet();

-- ── DATA MIGRATION: seed market_outcomes from existing options JSONB ──
-- For binary markets (option id IN yes/no/up/down): one row per option
-- For multi-candidate: one row per unique slug (strip _yes/_no suffix, keep first occurrence)

INSERT INTO public.market_outcomes (market_id, slug, name, sort_order, color_index, status)
SELECT DISTINCT ON (m.id, REGEXP_REPLACE(opt->>'id', '_(yes|no)$', ''))
  m.id AS market_id,
  REGEXP_REPLACE(opt->>'id', '_(yes|no)$', '') AS slug,
  TRIM(REGEXP_REPLACE(opt->>'label', '\s+(YES|NO|Yes|No)$', '')) AS name,
  (ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY opt_idx)) - 1 AS sort_order,
  ((ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY opt_idx)) - 1) % 8 AS color_index,
  'active' AS status
FROM public.markets m,
  jsonb_array_elements(m.options) WITH ORDINALITY AS t(opt, opt_idx)
WHERE
  -- For binary markets: include all options
  -- For multi-candidate: only the _yes side (avoids duplicates)
  (REGEXP_REPLACE(opt->>'id', '_(yes|no)$', '') IN ('yes','no','up','down'))
  OR (opt->>'id' NOT LIKE '%_no')
ORDER BY m.id, REGEXP_REPLACE(opt->>'id', '_(yes|no)$', ''), opt_idx
ON CONFLICT (market_id, slug) DO NOTHING;
