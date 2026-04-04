-- 1. Fix contract storage policy - restrict to specific roles
DROP POLICY IF EXISTS "contract_files_read" ON storage.objects;
CREATE POLICY "contract_files_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','KETOAN'])
);

-- 2. Fix SOP read policy - require authentication
DROP POLICY IF EXISTS "sop_read" ON public.department_sops;
CREATE POLICY "sop_read" ON public.department_sops FOR SELECT TO authenticated
USING ((department_id IS NULL) OR (department_id = get_my_department_id()));

-- 3. Make sop-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'sop-files';

-- 4. Fix search_path on prevent_profile_field_change
CREATE OR REPLACE FUNCTION public.prevent_profile_field_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.id AND NOT has_any_role(auth.uid(), ARRAY['ADMIN']) THEN
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi mã nhân viên';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;