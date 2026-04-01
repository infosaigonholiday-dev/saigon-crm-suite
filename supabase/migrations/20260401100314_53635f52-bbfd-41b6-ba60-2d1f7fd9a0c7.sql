
-- 1. Create trigger function for audit logging on DELETE
CREATE OR REPLACE FUNCTION public.log_delete_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, user_id, old_data, created_at)
  VALUES (
    'DELETE',
    TG_TABLE_NAME,
    OLD.id,
    auth.uid(),
    to_jsonb(OLD),
    now()
  );
  RETURN OLD;
END;
$function$;

-- 2. Attach trigger to all business tables
CREATE OR REPLACE TRIGGER audit_delete_bookings
  BEFORE DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_customers
  BEFORE DELETE ON customers FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_leads
  BEFORE DELETE ON leads FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_employees
  BEFORE DELETE ON employees FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_transactions
  BEFORE DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_tour_services
  BEFORE DELETE ON tour_services FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_office_expenses
  BEFORE DELETE ON office_expenses FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_marketing_expenses
  BEFORE DELETE ON marketing_expenses FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_other_expenses
  BEFORE DELETE ON other_expenses FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_booking_itineraries
  BEFORE DELETE ON booking_itineraries FOR EACH ROW EXECUTE FUNCTION log_delete_action();

CREATE OR REPLACE TRIGGER audit_delete_vendors
  BEFORE DELETE ON vendors FOR EACH ROW EXECUTE FUNCTION log_delete_action();

-- 3. Update RLS on audit_logs: allow DIRECTOR to read too
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_read" ON audit_logs FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR']));
