-- 0015: Harden the admin SELECT policy on profiles against RLS recursion.
--
-- Audit finding L2 claimed the "Admins see all profiles" policy selected from
-- profiles directly (infinite recursion). Live-DB inspection (2026-07-12) showed the
-- policy already delegates to public.is_admin(), a SECURITY DEFINER function that
-- bypasses RLS — so recursion was already mitigated. This migration standardises on
-- an explicit, parameterised helper (is_admin_user) so the non-recursive property is
-- documented and reusable by future policies, and recreates the policy on top of it.

-- Drop the existing admin policy on profiles
DROP POLICY IF EXISTS "Admins see all profiles" ON public.profiles;

-- Non-recursive helper: SECURITY DEFINER bypasses RLS on profiles, so evaluating it
-- inside a profiles policy cannot re-trigger the policy. search_path is pinned to
-- prevent function hijacking via a malicious schema.
CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = uid LIMIT 1),
    false
  )
$$;

-- Non-recursive admin read policy
CREATE POLICY "Admins see all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_user(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, anon;
