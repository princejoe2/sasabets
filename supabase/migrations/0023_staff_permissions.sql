-- Add per-user custom permissions column to profiles.
-- When NULL → fall back to the role's default allowed paths.
-- When set → these exact paths are used for sidebar + page-level access.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS staff_permissions text[] DEFAULT NULL;
