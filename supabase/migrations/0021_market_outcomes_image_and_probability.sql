-- ═══════════════════════════════════════════════════════════════
-- 0021: Add image-metadata and probability columns to market_outcomes
-- Additive migration — no data loss, all new columns nullable/defaulted.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.market_outcomes
  ADD COLUMN IF NOT EXISTS image_source       text,
  ADD COLUMN IF NOT EXISTS image_credit       text,
  ADD COLUMN IF NOT EXISTS image_override     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS probability        numeric(6,4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'market_outcomes_probability_check'
      AND conrelid = 'public.market_outcomes'::regclass
  ) THEN
    ALTER TABLE public.market_outcomes
      ADD CONSTRAINT market_outcomes_probability_check
      CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1));
  END IF;
END;
$$;

COMMENT ON COLUMN public.market_outcomes.image_source       IS 'Origin of the image (wikipedia, unsplash, pexels, upload, etc.)';
COMMENT ON COLUMN public.market_outcomes.image_credit       IS 'Attribution text required by the image licence';
COMMENT ON COLUMN public.market_outcomes.image_override     IS 'True when an admin manually uploaded the image; resolver must not replace it';
COMMENT ON COLUMN public.market_outcomes.image_needs_review IS 'True when the auto-resolver fell back to initials; shown as a flag in admin';
COMMENT ON COLUMN public.market_outcomes.probability        IS 'Cached YES probability (0–1); updated by the outcome_price trigger and backfills';
