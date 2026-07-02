-- Add created_by column for user-created markets
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_markets_created_by ON public.markets(created_by);
