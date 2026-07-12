-- Add username to profiles (unique, lowercase, 3-20 chars enforced at app level)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username VARCHAR(20);

-- Case-insensitive uniqueness (usernames are always stored lowercase)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL;
