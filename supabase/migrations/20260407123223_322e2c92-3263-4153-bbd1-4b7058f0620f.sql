
-- Add must_change_password and first_login_at columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz;

-- Set existing users who already have accounts to must_change_password = false
-- (they already have working passwords)
UPDATE public.profiles SET must_change_password = false WHERE must_change_password IS NULL OR must_change_password = true;

-- Update handle_new_user trigger to set must_change_password = true for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(TRIM(UPPER(NEW.raw_user_meta_data->>'role')), ''),
      'SALE_DOMESTIC'
    ),
    true,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
