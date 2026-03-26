-- Use a BEFORE UPDATE trigger to enforce role immutability instead of relying on WITH CHECK
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow ADMIN to change role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT has_role(auth.uid(), 'ADMIN') THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_immutability ON profiles;
CREATE TRIGGER enforce_role_immutability
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- Simplify the self-update policy since trigger now handles role protection
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);