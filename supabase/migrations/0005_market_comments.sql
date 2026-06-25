-- Market comments: one table, per-user RLS, rate-limit enforced in API
CREATE TABLE IF NOT EXISTS public.market_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id  uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_comments_market_id_idx ON public.market_comments (market_id, created_at DESC);

ALTER TABLE public.market_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_all"   ON public.market_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.market_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.market_comments FOR DELETE USING (auth.uid() = user_id);
