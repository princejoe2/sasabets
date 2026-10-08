-- ═══════════════════════════════════════════════════════════════
-- 0022: Backfill 6 binary markets that had only one outcome row
-- All were open markets whose options JSONB had a null element for
-- the partner side, so the 0020 seeder skipped it.
-- ═══════════════════════════════════════════════════════════════

-- Fix sort_order of the orphaned 'no' rows (they sat at 0 instead of 1)
UPDATE public.market_outcomes
SET sort_order = 1
WHERE market_id IN (
  '138c99dc-a382-4263-9ae1-d58b2091d47d',
  '1a162536-419f-423f-b46a-b63cb0fb54e1',
  '436c846f-bb95-445d-b6ca-e6db5b8dff7a',
  '86c4c950-da9c-435a-968f-04818ef47c63'
) AND slug = 'no';

-- Insert missing 'yes' rows (4 markets that only had 'no')
INSERT INTO public.market_outcomes (market_id, slug, name, sort_order, color_index, status)
VALUES
  ('138c99dc-a382-4263-9ae1-d58b2091d47d', 'yes', 'Yes - Vipers SC win',                     0, 0, 'active'),
  ('1a162536-419f-423f-b46a-b63cb0fb54e1', 'yes', 'Yes - Uganda win',                        0, 0, 'active'),
  ('436c846f-bb95-445d-b6ca-e6db5b8dff7a', 'yes', 'Yes - Uganda win at least one medal',     0, 0, 'active'),
  ('86c4c950-da9c-435a-968f-04818ef47c63', 'yes', 'Yes - She Cranes reach the semifinals',   0, 0, 'active')
ON CONFLICT (market_id, slug) DO NOTHING;

-- Insert missing 'no' rows (2 markets that only had 'yes')
INSERT INTO public.market_outcomes (market_id, slug, name, sort_order, color_index, status)
VALUES
  ('a1f6be11-7cb5-4ef3-bc46-88fcad1849dc', 'no', 'No - stays at or below UGX 6,500/litre',  1, 1, 'active'),
  ('fae3a90f-be33-4f34-9297-ebc1eb313049', 'no', 'No - stays at or below 4.0%',              1, 1, 'active')
ON CONFLICT (market_id, slug) DO NOTHING;
