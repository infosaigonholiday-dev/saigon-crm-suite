-- Fix #4: Add is_active check to has_role and has_any_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND role = _role AND is_active = true
  )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND role = ANY(_roles) AND is_active = true
  )
$function$;

-- Fix #2: Trigger to prevent users from changing protected profile fields
CREATE OR REPLACE FUNCTION public.prevent_profile_field_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check for non-admin self-updates
  IF auth.uid() = NEW.id AND NOT has_any_role(auth.uid(), ARRAY['ADMIN', 'SUPER_ADMIN']) THEN
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi mã nhân viên';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS trg_prevent_profile_field_change ON profiles;
CREATE TRIGGER trg_prevent_profile_field_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_field_change();