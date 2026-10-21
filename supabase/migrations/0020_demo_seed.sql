-- Migration 0020: demo seed columns
-- Adds is_demo flag to profiles and bets for social-proof ghost data.
-- Demo records are excluded from all admin views and settlement payouts.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.bets     ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_bets_is_demo     ON public.bets(is_demo)     WHERE is_demo = TRUE;
