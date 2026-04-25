-- 1. Auto-link existing employees with matching profile email
UPDATE public.employees e
SET profile_id = p.id
FROM public.profiles p
WHERE e.profile_id IS NULL
  AND e.deleted_at IS NULL
  AND p.is_active = true
  AND e.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(trim(p.email)) = lower(trim(e.email));

-- 2. Create employee record for active ADMIN/SUPER_ADMIN accounts that don't have one
INSERT INTO public.employees (profile_id, full_name, email, position, status, hire_date)
SELECT 
  p.id, 
  COALESCE(p.full_name, split_part(p.email, '@', 1)), 
  p.email, 
  'GIAM_DOC', 
  'ACTIVE', 
  CURRENT_DATE
FROM public.profiles p
WHERE p.role IN ('ADMIN','SUPER_ADMIN')
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.profile_id = p.id AND e.deleted_at IS NULL
  );

-- 3. Trigger to auto-link future employees by email
CREATE OR REPLACE FUNCTION public.auto_link_employee_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.profile_id 
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(NEW.email)) 
      AND is_active = true 
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_employee_to_profile_trg ON public.employees;
CREATE TRIGGER auto_link_employee_to_profile_trg
  BEFORE INSERT OR UPDATE OF email ON public.employees
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_link_employee_to_profile();