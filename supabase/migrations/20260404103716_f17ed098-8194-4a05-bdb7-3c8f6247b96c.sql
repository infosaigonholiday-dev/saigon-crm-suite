CREATE OR REPLACE FUNCTION prevent_profile_field_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service_role (edge functions) to bypass
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