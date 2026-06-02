-- Security fix: prevent privilege escalation via profiles.role
--
-- The RLS policy "Users update own profile" uses only USING (auth.uid() = id)
-- with no WITH CHECK, so an authenticated user could set their OWN role to
-- 'admin' through the data API. This trigger enforces that only existing
-- admins (or the service role / internal contexts with no JWT) may change a
-- profile's role, and that self-service inserts default to 'customer'.

CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role / internal contexts (no end-user JWT) and existing admins
  -- are allowed to manage roles freely.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A non-admin may only ever create a 'customer' profile for themselves.
    NEW.role := 'customer';
  ELSIF TG_OP = 'UPDATE' THEN
    -- A non-admin may not change their role.
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only admins can change a profile role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_profile_role ON public.profiles;
CREATE TRIGGER guard_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();
