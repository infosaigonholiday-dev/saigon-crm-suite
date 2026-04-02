
-- 1. Update CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'ADMIN',
  'HCNS', 'HR_MANAGER',
  'KETOAN',
  'MANAGER', 'GDKD',
  'DIEUHAN',
  'SALE_DOMESTIC', 'SALE_INBOUND', 'SALE_OUTBOUND', 'SALE_MICE',
  'TOUR', 'MKT',
  'INTERN_DIEUHAN', 'INTERN_SALE_DOMESTIC', 'INTERN_SALE_OUTBOUND',
  'INTERN_SALE_MICE', 'INTERN_SALE_INBOUND', 'INTERN_MKT',
  'INTERN_HCNS', 'INTERN_KETOAN'
));

-- 2. Update DB functions
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'ADMIN' THEN ARRAY['customers.view','customers.create','customers.edit','customers.delete','customers.export','leads.view','leads.create','leads.edit','leads.delete','bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve','quotations.view','quotations.create','quotations.edit','quotations.delete','payments.view','payments.create','payments.edit','payments.delete','employees.view','employees.create','employees.edit','employees.delete','leave.view','leave.create','leave.approve','payroll.view','payroll.create','payroll.edit','finance.view','finance.create','finance.edit','finance.submit','settings.view','settings.edit','sop.view','sop.create','vendors.view']
    WHEN 'HCNS' THEN ARRAY['employees.view','employees.create','employees.edit','leave.view','leave.create','leave.approve','payroll.view','payroll.create','payroll.edit','finance.create','finance.submit','settings.view','sop.view','sop.create']
    WHEN 'HR_MANAGER' THEN ARRAY['employees.view','employees.create','employees.edit','leave.view','leave.create','leave.approve','payroll.view','payroll.create','payroll.edit','finance.submit','settings.view','sop.view','sop.create']
    WHEN 'KETOAN' THEN ARRAY['customers.view','bookings.view','payments.view','payments.create','payments.edit','payroll.view','payroll.edit','finance.view','finance.edit','finance.submit','settings.view','sop.view','vendors.view']
    WHEN 'MANAGER' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','bookings.edit','quotations.view','quotations.create','quotations.edit','payments.view','payments.create','employees.view','leave.view','leave.approve','finance.submit','sop.view','sop.create']
    WHEN 'GDKD' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','bookings.edit','quotations.view','quotations.create','quotations.edit','payments.view','payments.create','employees.view','leave.view','leave.approve','finance.submit','sop.view','sop.create']
    WHEN 'DIEUHAN' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','bookings.edit','bookings.approve','quotations.view','quotations.create','quotations.edit','payments.view','payments.create','payments.edit','finance.create','finance.submit','sop.view','sop.create','vendors.view']
    WHEN 'SALE_DOMESTIC' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','quotations.view','quotations.create','quotations.edit','payments.view','leave.view','leave.create','sop.view']
    WHEN 'SALE_INBOUND' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','quotations.view','quotations.create','quotations.edit','payments.view','leave.view','leave.create','sop.view']
    WHEN 'SALE_OUTBOUND' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','quotations.view','quotations.create','quotations.edit','payments.view','leave.view','leave.create','sop.view']
    WHEN 'SALE_MICE' THEN ARRAY['customers.view','customers.create','customers.edit','leads.view','leads.create','leads.edit','bookings.view','bookings.create','quotations.view','quotations.create','quotations.edit','payments.view','leave.view','leave.create','sop.view']
    WHEN 'TOUR' THEN ARRAY['customers.view','bookings.view','leave.view','leave.create','sop.view']
    WHEN 'MKT' THEN ARRAY['customers.view','leads.view','leads.create','leads.edit','leave.view','leave.create','sop.view']
    WHEN 'INTERN_DIEUHAN' THEN ARRAY['bookings.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_SALE_DOMESTIC' THEN ARRAY['customers.view','leads.view','bookings.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_SALE_OUTBOUND' THEN ARRAY['customers.view','leads.view','bookings.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_SALE_MICE' THEN ARRAY['customers.view','leads.view','bookings.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_SALE_INBOUND' THEN ARRAY['customers.view','leads.view','bookings.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_MKT' THEN ARRAY['customers.view','leads.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_HCNS' THEN ARRAY['employees.view','leave.view','leave.create','sop.view']
    WHEN 'INTERN_KETOAN' THEN ARRAY['customers.view','bookings.view','payments.view','leave.view','leave.create','sop.view']
    ELSE ARRAY[]::text[]
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_field_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
$function$;

-- 3. Drop and recreate all RLS policies that reference SUPER_ADMIN (also clean DIRECTOR, HR_HEAD)

-- accommodations
DROP POLICY IF EXISTS accommodations_write ON accommodations;
CREATE POLICY accommodations_write ON accommodations FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

-- audit_logs
DROP POLICY IF EXISTS audit_logs_read ON audit_logs;
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

-- booking_itineraries
DROP POLICY IF EXISTS booking_itineraries_delete ON booking_itineraries;
CREATE POLICY booking_itineraries_delete ON booking_itineraries FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS booking_itineraries_insert ON booking_itineraries;
CREATE POLICY booking_itineraries_insert ON booking_itineraries FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())) OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'TOUR']));

DROP POLICY IF EXISTS booking_itineraries_read ON booking_itineraries;
CREATE POLICY booking_itineraries_read ON booking_itineraries FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())) OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'KETOAN', 'TOUR']));

DROP POLICY IF EXISTS booking_itineraries_update ON booking_itineraries;
CREATE POLICY booking_itineraries_update ON booking_itineraries FOR UPDATE TO authenticated
  USING ((EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())) OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'TOUR']))
  WITH CHECK ((EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())) OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'TOUR']));

-- booking_special_notes
DROP POLICY IF EXISTS booking_notes_delete ON booking_special_notes;
CREATE POLICY booking_notes_delete ON booking_special_notes FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS booking_notes_read ON booking_special_notes;
CREATE POLICY booking_notes_read ON booking_special_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND (b.sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'KETOAN', 'TOUR']) OR (b.department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD'])))));

DROP POLICY IF EXISTS booking_notes_write ON booking_special_notes;
CREATE POLICY booking_notes_write ON booking_special_notes FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']) OR (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND b.sale_id = auth.uid())));

-- bookings
DROP POLICY IF EXISTS bookings_delete ON bookings;
CREATE POLICY bookings_delete ON bookings FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS bookings_read ON bookings;
CREATE POLICY bookings_read ON bookings FOR SELECT TO authenticated
  USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD'])));

DROP POLICY IF EXISTS bookings_update ON bookings;
CREATE POLICY bookings_update ON bookings FOR UPDATE TO authenticated
  USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']))
  WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

DROP POLICY IF EXISTS bookings_write ON bookings;
CREATE POLICY bookings_write ON bookings FOR INSERT TO authenticated
  WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- budget_estimate_items
DROP POLICY IF EXISTS estimate_items_all ON budget_estimate_items;
CREATE POLICY estimate_items_all ON budget_estimate_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']))))
  WITH CHECK (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']))));

-- budget_estimates
DROP POLICY IF EXISTS estimates_delete ON budget_estimates;
CREATE POLICY estimates_delete ON budget_estimates FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS estimates_read ON budget_estimates;
CREATE POLICY estimates_read ON budget_estimates FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']));

DROP POLICY IF EXISTS estimates_update ON budget_estimates;
CREATE POLICY estimates_update ON budget_estimates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS estimates_write ON budget_estimates;
CREATE POLICY estimates_write ON budget_estimates FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- budget_settlements
DROP POLICY IF EXISTS settlements_delete ON budget_settlements;
CREATE POLICY settlements_delete ON budget_settlements FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS settlements_read ON budget_settlements;
CREATE POLICY settlements_read ON budget_settlements FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']));

DROP POLICY IF EXISTS settlements_update ON budget_settlements;
CREATE POLICY settlements_update ON budget_settlements FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS settlements_write ON budget_settlements;
CREATE POLICY settlements_write ON budget_settlements FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- contracts
DROP POLICY IF EXISTS contracts_delete ON contracts;
CREATE POLICY contracts_delete ON contracts FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS contracts_insert ON contracts;
CREATE POLICY contracts_insert ON contracts FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']) OR created_by = auth.uid());

DROP POLICY IF EXISTS contracts_read ON contracts;
CREATE POLICY contracts_read ON contracts FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'KETOAN']));

DROP POLICY IF EXISTS contracts_update ON contracts;
CREATE POLICY contracts_update ON contracts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']))
  WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- customers
DROP POLICY IF EXISTS customers_delete ON customers;
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS customers_insert ON customers;
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated
  WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

DROP POLICY IF EXISTS customers_read ON customers;
CREATE POLICY customers_read ON customers FOR SELECT TO authenticated
  USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD'])));

DROP POLICY IF EXISTS customers_update ON customers;
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated
  USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']))
  WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- department_sops
DROP POLICY IF EXISTS sop_delete ON department_sops;
CREATE POLICY sop_delete ON department_sops FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS sop_read ON department_sops;
CREATE POLICY sop_read ON department_sops FOR SELECT TO authenticated
  USING (department_id IS NULL OR department_id = get_my_department_id() OR has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS sop_update ON department_sops;
CREATE POLICY sop_update ON department_sops FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN']))
  WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS sop_write ON department_sops;
CREATE POLICY sop_write ON department_sops FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'GDKD', 'DIEUHAN']));

-- documents
DROP POLICY IF EXISTS documents_delete ON documents;
CREATE POLICY documents_delete ON documents FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

-- employee_kpis
DROP POLICY IF EXISTS employee_kpis_delete ON employee_kpis;
CREATE POLICY employee_kpis_delete ON employee_kpis FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS kpi_delete ON employee_kpis;
CREATE POLICY kpi_delete ON employee_kpis FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS kpi_read ON employee_kpis;
CREATE POLICY kpi_read ON employee_kpis FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD', 'DIEUHAN'])));

DROP POLICY IF EXISTS kpi_update ON employee_kpis;
CREATE POLICY kpi_update ON employee_kpis FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'GDKD', 'DIEUHAN']));

DROP POLICY IF EXISTS kpi_write ON employee_kpis;
CREATE POLICY kpi_write ON employee_kpis FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'GDKD', 'DIEUHAN']));

-- employee_permissions
DROP POLICY IF EXISTS permissions_read ON employee_permissions;
CREATE POLICY permissions_read ON employee_permissions FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS permissions_write ON employee_permissions;
CREATE POLICY permissions_write ON employee_permissions FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN']));

-- employees
DROP POLICY IF EXISTS employees_delete ON employees;
CREATE POLICY employees_delete ON employees FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS employees_insert ON employees;
CREATE POLICY employees_insert ON employees FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER']));

DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS', 'KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD', 'DIEUHAN'])));

DROP POLICY IF EXISTS employees_update ON employees;
CREATE POLICY employees_update ON employees FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']));

-- leads
DROP POLICY IF EXISTS leads_delete ON leads;
CREATE POLICY leads_delete ON leads FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS leads_insert ON leads;
CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated
  WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

DROP POLICY IF EXISTS leads_read ON leads;
CREATE POLICY leads_read ON leads FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD'])));

DROP POLICY IF EXISTS leads_update ON leads;
CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']))
  WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- leave_requests
DROP POLICY IF EXISTS leave_requests_delete ON leave_requests;
CREATE POLICY leave_requests_delete ON leave_requests FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS leave_requests_insert ON leave_requests;
CREATE POLICY leave_requests_insert ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']));

DROP POLICY IF EXISTS leave_requests_select ON leave_requests;
CREATE POLICY leave_requests_select ON leave_requests FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']) OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD', 'DIEUHAN'])));

DROP POLICY IF EXISTS leave_requests_update ON leave_requests;
CREATE POLICY leave_requests_update ON leave_requests FOR UPDATE TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']) OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD', 'DIEUHAN'])))
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']) OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER', 'GDKD', 'DIEUHAN'])));

-- marketing_expenses
DROP POLICY IF EXISTS marketing_expenses_delete ON marketing_expenses;
CREATE POLICY marketing_expenses_delete ON marketing_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS marketing_expenses_insert ON marketing_expenses;
CREATE POLICY marketing_expenses_insert ON marketing_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'MKT']));

DROP POLICY IF EXISTS marketing_expenses_read ON marketing_expenses;
CREATE POLICY marketing_expenses_read ON marketing_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'MKT']));

DROP POLICY IF EXISTS marketing_expenses_update ON marketing_expenses;
CREATE POLICY marketing_expenses_update ON marketing_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'MKT']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'MKT']));

-- storage: contract-files
DROP POLICY IF EXISTS contract_files_delete ON storage.objects;
CREATE POLICY contract_files_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contract-files' AND has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS contract_files_insert ON storage.objects;
CREATE POLICY contract_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-files' AND (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']) OR (auth.uid())::text = (storage.foldername(name))[1]));

-- office_expenses
DROP POLICY IF EXISTS office_expenses_delete ON office_expenses;
CREATE POLICY office_expenses_delete ON office_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS office_expenses_insert ON office_expenses;
CREATE POLICY office_expenses_insert ON office_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS office_expenses_read ON office_expenses;
CREATE POLICY office_expenses_read ON office_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS office_expenses_update ON office_expenses;
CREATE POLICY office_expenses_update ON office_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

-- other_expenses
DROP POLICY IF EXISTS other_expenses_delete ON other_expenses;
CREATE POLICY other_expenses_delete ON other_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS other_expenses_insert ON other_expenses;
CREATE POLICY other_expenses_insert ON other_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS other_expenses_read ON other_expenses;
CREATE POLICY other_expenses_read ON other_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS other_expenses_update ON other_expenses;
CREATE POLICY other_expenses_update ON other_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

-- payroll
DROP POLICY IF EXISTS payroll_delete ON payroll;
CREATE POLICY payroll_delete ON payroll FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS payroll_insert ON payroll;
CREATE POLICY payroll_insert ON payroll FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']));

DROP POLICY IF EXISTS payroll_select ON payroll;
CREATE POLICY payroll_select ON payroll FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS', 'KETOAN']));

DROP POLICY IF EXISTS payroll_update ON payroll;
CREATE POLICY payroll_update ON payroll FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS', 'KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS', 'KETOAN']));

-- profiles
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'HR_MANAGER', 'HCNS']));

-- quotations
DROP POLICY IF EXISTS quotations_access ON quotations;
CREATE POLICY quotations_access ON quotations FOR ALL TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']))
  WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN']));

-- settlement_items
DROP POLICY IF EXISTS settlement_items_all ON settlement_items;
CREATE POLICY settlement_items_all ON settlement_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']))))
  WITH CHECK (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN', 'DIEUHAN']))));

-- sop_acknowledgements
DROP POLICY IF EXISTS sop_ack_delete ON sop_acknowledgements;
CREATE POLICY sop_ack_delete ON sop_acknowledgements FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS sop_ack_select ON sop_acknowledgements;
CREATE POLICY sop_ack_select ON sop_acknowledgements FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN', 'MANAGER', 'GDKD', 'DIEUHAN']));

-- tour_itineraries
DROP POLICY IF EXISTS tour_itineraries_write ON tour_itineraries;
CREATE POLICY tour_itineraries_write ON tour_itineraries FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

-- tour_packages
DROP POLICY IF EXISTS tour_packages_write ON tour_packages;
CREATE POLICY tour_packages_write ON tour_packages FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

-- tour_services
DROP POLICY IF EXISTS tour_services_delete ON tour_services;
CREATE POLICY tour_services_delete ON tour_services FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS tour_services_insert ON tour_services;
CREATE POLICY tour_services_insert ON tour_services FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

DROP POLICY IF EXISTS tour_services_read ON tour_services;
CREATE POLICY tour_services_read ON tour_services FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'KETOAN']));

DROP POLICY IF EXISTS tour_services_update ON tour_services;
CREATE POLICY tour_services_update ON tour_services FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

-- transactions
DROP POLICY IF EXISTS transactions_admin ON transactions;
CREATE POLICY transactions_admin ON transactions FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']));

DROP POLICY IF EXISTS transactions_delete ON transactions;
CREATE POLICY transactions_delete ON transactions FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']) OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT', 'PENDING_REVIEW']) AND has_any_role(auth.uid(), ARRAY['HCNS', 'HR_MANAGER'])));

DROP POLICY IF EXISTS transactions_read ON transactions;
CREATE POLICY transactions_read ON transactions FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']) OR (submitted_by = auth.uid() AND has_any_role(auth.uid(), ARRAY['HCNS', 'HR_MANAGER'])));

DROP POLICY IF EXISTS transactions_update ON transactions;
CREATE POLICY transactions_update ON transactions FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']) OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT', 'REJECTED']) AND has_any_role(auth.uid(), ARRAY['HCNS', 'HR_MANAGER'])))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'KETOAN']) OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT', 'PENDING_REVIEW']) AND has_any_role(auth.uid(), ARRAY['HCNS', 'HR_MANAGER'])));

-- vendors
DROP POLICY IF EXISTS vendors_delete ON vendors;
CREATE POLICY vendors_delete ON vendors FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN']));

DROP POLICY IF EXISTS vendors_insert ON vendors;
CREATE POLICY vendors_insert ON vendors FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));

DROP POLICY IF EXISTS vendors_read ON vendors;
CREATE POLICY vendors_read ON vendors FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD', 'KETOAN']));

DROP POLICY IF EXISTS vendors_update ON vendors;
CREATE POLICY vendors_update ON vendors FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN', 'DIEUHAN', 'MANAGER', 'GDKD']));
