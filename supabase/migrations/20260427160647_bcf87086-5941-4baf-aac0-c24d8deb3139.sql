
-- Trigger audit cho payroll
CREATE OR REPLACE FUNCTION public.log_payroll_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM profiles WHERE id = auth.uid();

    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_role, user_full_name, change_summary, created_at)
    VALUES (
      'payroll',
      NEW.id,
      'STATUS_CHANGE',
      jsonb_build_object('status', OLD.status, 'net_salary', OLD.net_salary),
      jsonb_build_object(
        'status', NEW.status,
        'net_salary', NEW.net_salary,
        'hr_reviewed_by', NEW.hr_reviewed_by,
        'kt_confirmed_by', NEW.kt_confirmed_by,
        'ceo_approved_by', NEW.ceo_approved_by
      ),
      auth.uid(),
      v_user_role,
      v_user_name,
      format('Payroll %s → %s', OLD.status, NEW.status),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payroll ON public.payroll;
CREATE TRIGGER trg_audit_payroll
AFTER UPDATE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION public.log_payroll_changes();

-- Trigger audit cho candidates
CREATE OR REPLACE FUNCTION public.log_candidate_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM profiles WHERE id = auth.uid();

    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_role, user_full_name, change_summary, created_at)
    VALUES (
      'candidates',
      NEW.id,
      'STATUS_CHANGE',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'rejection_reason', NEW.rejection_reason),
      auth.uid(),
      v_user_role,
      v_user_name,
      format('Candidate %s → %s', OLD.status, NEW.status),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_candidates ON public.candidates;
CREATE TRIGGER trg_audit_candidates
AFTER UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.log_candidate_status_changes();
