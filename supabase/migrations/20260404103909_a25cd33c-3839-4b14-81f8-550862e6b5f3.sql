CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'HR_MANAGER') OR has_role(auth.uid(), 'HCNS')) THEN
      RAISE EXCEPTION 'Chỉ Admin/HR mới được thay đổi chức vụ nhân viên';
    END IF;
  END IF;
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    IF NOT (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'HR_MANAGER') OR has_role(auth.uid(), 'HCNS')) THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;