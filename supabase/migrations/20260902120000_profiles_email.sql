-- Add email to profiles so the admin customers screen can identify customers
-- (magic-link signups have no name, and auth.users is unreadable from the client).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Copy the email on signup, alongside the name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- Backfill existing profiles from auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;
