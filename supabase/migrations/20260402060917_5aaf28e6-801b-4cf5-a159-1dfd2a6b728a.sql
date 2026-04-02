
-- Disable the role immutability trigger
DROP TRIGGER IF EXISTS enforce_role_immutability ON profiles;

-- Migrate users
UPDATE profiles SET role = 'GDKD' WHERE role = 'DIRECTOR';
UPDATE profiles SET role = 'HR_MANAGER' WHERE role = 'HR_HEAD';
UPDATE profiles SET role = 'INTERN_SALE_DOMESTIC' WHERE role = 'INTERN';

-- Re-create with updated function
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'SUPER_ADMIN') OR has_role(auth.uid(), 'HR_MANAGER') OR has_role(auth.uid(), 'HCNS')) THEN
      RAISE EXCEPTION 'Chỉ Admin/HR mới được thay đổi chức vụ nhân viên';
    END IF;
  END IF;
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    IF NOT (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'SUPER_ADMIN') OR has_role(auth.uid(), 'HR_MANAGER') OR has_role(auth.uid(), 'HCNS')) THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_role_immutability BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

-- Update constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'ADMIN','SUPER_ADMIN','HCNS','HR_MANAGER','KETOAN','MANAGER','GDKD','DIEUHAN',
  'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE','TOUR','MKT',
  'INTERN_DIEUHAN','INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE','INTERN_SALE_INBOUND','INTERN_MKT','INTERN_HCNS','INTERN_KETOAN'
));

-- Update permissions function
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'ADMIN' THEN ARRAY['customers.view','customers.create','customers.edit','customers.delete','customers.export','leads.view','leads.create','leads.edit','leads.delete','bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve','quotations.view','quotations.create','quotations.edit','quotations.delete','payments.view','payments.create','payments.edit','payments.delete','employees.view','employees.create','employees.edit','employees.delete','leave.view','leave.create','leave.approve','payroll.view','payroll.create','payroll.edit','finance.view','finance.create','finance.edit','finance.submit','settings.view','settings.edit','sop.view','sop.create','vendors.view']
    WHEN 'SUPER_ADMIN' THEN ARRAY['customers.view','customers.create','customers.edit','customers.delete','customers.export','leads.view','leads.create','leads.edit','leads.delete','bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve','quotations.view','quotations.create','quotations.edit','quotations.delete','payments.view','payments.create','payments.edit','payments.delete','employees.view','employees.create','employees.edit','employees.delete','leave.view','leave.create','leave.approve','payroll.view','payroll.create','payroll.edit','finance.view','finance.create','finance.edit','finance.submit','settings.view','settings.edit','sop.view','sop.create','vendors.view']
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

-- Update ALL RLS policies
DROP POLICY IF EXISTS accommodations_write ON accommodations;
CREATE POLICY accommodations_write ON accommodations FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD']));
DROP POLICY IF EXISTS accounts_payable_access ON accounts_payable;
CREATE POLICY accounts_payable_access ON accounts_payable FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS accounts_receivable_access ON accounts_receivable;
CREATE POLICY accounts_receivable_access ON accounts_receivable FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS audit_logs_read ON audit_logs;
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
DROP POLICY IF EXISTS benefits_policies_write ON benefits_policies;
CREATE POLICY benefits_policies_write ON benefits_policies FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS booking_itineraries_insert ON booking_itineraries;
CREATE POLICY booking_itineraries_insert ON booking_itineraries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD','TOUR']));
DROP POLICY IF EXISTS booking_itineraries_read ON booking_itineraries;
CREATE POLICY booking_itineraries_read ON booking_itineraries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD','KETOAN','TOUR']));
DROP POLICY IF EXISTS booking_itineraries_update ON booking_itineraries;
CREATE POLICY booking_itineraries_update ON booking_itineraries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD','TOUR'])) WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD','TOUR']));
DROP POLICY IF EXISTS booking_notes_read ON booking_special_notes;
CREATE POLICY booking_notes_read ON booking_special_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND (b.sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN','TOUR']) OR (b.department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])))));
DROP POLICY IF EXISTS booking_notes_write ON booking_special_notes;
CREATE POLICY booking_notes_write ON booking_special_notes FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD']) OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND b.sale_id = auth.uid()));
DROP POLICY IF EXISTS bookings_read ON bookings;
CREATE POLICY bookings_read ON bookings FOR SELECT TO authenticated USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])));
DROP POLICY IF EXISTS bookings_update ON bookings;
CREATE POLICY bookings_update ON bookings FOR UPDATE TO authenticated USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN'])) WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS bookings_write ON bookings;
CREATE POLICY bookings_write ON bookings FOR INSERT TO authenticated WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS estimate_items_all ON budget_estimate_items;
CREATE POLICY estimate_items_all ON budget_estimate_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN'])))) WITH CHECK (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN']))));
DROP POLICY IF EXISTS estimates_read ON budget_estimates;
CREATE POLICY estimates_read ON budget_estimates FOR SELECT TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN']));
DROP POLICY IF EXISTS estimates_update ON budget_estimates;
CREATE POLICY estimates_update ON budget_estimates FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS estimates_write ON budget_estimates;
CREATE POLICY estimates_write ON budget_estimates FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS budget_plans_access ON budget_plans;
CREATE POLICY budget_plans_access ON budget_plans FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS settlements_read ON budget_settlements;
CREATE POLICY settlements_read ON budget_settlements FOR SELECT TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN']));
DROP POLICY IF EXISTS settlements_update ON budget_settlements;
CREATE POLICY settlements_update ON budget_settlements FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS settlements_write ON budget_settlements;
CREATE POLICY settlements_write ON budget_settlements FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS business_travel_access ON business_travel;
CREATE POLICY business_travel_access ON business_travel FOR ALL TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS career_paths_read ON career_paths;
CREATE POLICY career_paths_read ON career_paths FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS career_paths_write ON career_paths;
CREATE POLICY career_paths_write ON career_paths FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS cashflow_monthly_access ON cashflow_monthly;
CREATE POLICY cashflow_monthly_access ON cashflow_monthly FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS commission_records_access ON commission_records;
CREATE POLICY commission_records_access ON commission_records FOR ALL TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS commission_rules_access ON commission_rules;
CREATE POLICY commission_rules_access ON commission_rules FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS contracts_insert ON contracts;
CREATE POLICY contracts_insert ON contracts FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']) OR created_by = auth.uid());
DROP POLICY IF EXISTS contracts_read ON contracts;
CREATE POLICY contracts_read ON contracts FOR SELECT TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN']));
DROP POLICY IF EXISTS contracts_update ON contracts;
CREATE POLICY contracts_update ON contracts FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS cost_records_access ON cost_records;
CREATE POLICY cost_records_access ON cost_records FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS customer_segment_rules_access ON customer_segment_rules;
CREATE POLICY customer_segment_rules_access ON customer_segment_rules FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN']));
DROP POLICY IF EXISTS customer_tags_access ON customer_tags;
CREATE POLICY customer_tags_access ON customer_tags FOR ALL TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN']) OR EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_tags.customer_id AND c.assigned_sale_id = auth.uid())) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS customers_insert ON customers;
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS customers_read ON customers;
CREATE POLICY customers_read ON customers FOR SELECT TO authenticated USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])));
DROP POLICY IF EXISTS customers_update ON customers;
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN'])) WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS data_assignments_access ON data_assignments;
CREATE POLICY data_assignments_access ON data_assignments FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS sop_read ON department_sops;
CREATE POLICY sop_read ON department_sops FOR SELECT TO authenticated USING (department_id IS NULL OR department_id = get_my_department_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
DROP POLICY IF EXISTS sop_update ON department_sops;
CREATE POLICY sop_update ON department_sops FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
DROP POLICY IF EXISTS sop_write ON department_sops;
CREATE POLICY sop_write ON department_sops FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','MANAGER','GDKD','DIEUHAN']));
DROP POLICY IF EXISTS kpi_delete ON employee_kpis;
CREATE POLICY kpi_delete ON employee_kpis FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
DROP POLICY IF EXISTS kpi_read ON employee_kpis;
CREATE POLICY kpi_read ON employee_kpis FOR SELECT TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN'])));
DROP POLICY IF EXISTS kpi_update ON employee_kpis;
CREATE POLICY kpi_update ON employee_kpis FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','MANAGER','GDKD','DIEUHAN']));
DROP POLICY IF EXISTS kpi_write ON employee_kpis;
CREATE POLICY kpi_write ON employee_kpis FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','MANAGER','GDKD','DIEUHAN']));
DROP POLICY IF EXISTS permissions_read ON employee_permissions;
CREATE POLICY permissions_read ON employee_permissions FOR SELECT TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
DROP POLICY IF EXISTS employee_salaries_access ON employee_salaries;
CREATE POLICY employee_salaries_access ON employee_salaries FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS employees_insert ON employees;
CREATE POLICY employees_insert ON employees FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','SUPER_ADMIN']));
DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees FOR SELECT TO authenticated USING (profile_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN'])));
DROP POLICY IF EXISTS employees_update ON employees;
CREATE POLICY employees_update ON employees FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','SUPER_ADMIN','HCNS'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','SUPER_ADMIN','HCNS']));
DROP POLICY IF EXISTS insurance_records_access ON insurance_records;
CREATE POLICY insurance_records_access ON insurance_records FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS invoices_access ON invoices;
CREATE POLICY invoices_access ON invoices FOR ALL TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS leads_insert ON leads;
CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS leads_read ON leads;
CREATE POLICY leads_read ON leads FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN']) OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])));
DROP POLICY IF EXISTS leads_update ON leads;
CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN'])) WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS leave_policies_write ON leave_policies;
CREATE POLICY leave_policies_write ON leave_policies FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS leave_requests_insert ON leave_requests;
CREATE POLICY leave_requests_insert ON leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
DROP POLICY IF EXISTS leave_requests_select ON leave_requests;
CREATE POLICY leave_requests_select ON leave_requests FOR SELECT TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']) OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN'])));
DROP POLICY IF EXISTS leave_requests_update ON leave_requests;
CREATE POLICY leave_requests_update ON leave_requests FOR UPDATE TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']) OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))) WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']) OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN'])));
DROP POLICY IF EXISTS marketing_expenses_insert ON marketing_expenses;
CREATE POLICY marketing_expenses_insert ON marketing_expenses FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','MKT']));
DROP POLICY IF EXISTS marketing_expenses_read ON marketing_expenses;
CREATE POLICY marketing_expenses_read ON marketing_expenses FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','MKT']));
DROP POLICY IF EXISTS marketing_expenses_update ON marketing_expenses;
CREATE POLICY marketing_expenses_update ON marketing_expenses FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','MKT'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','MKT']));
DROP POLICY IF EXISTS office_expenses_insert ON office_expenses;
CREATE POLICY office_expenses_insert ON office_expenses FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS office_expenses_read ON office_expenses;
CREATE POLICY office_expenses_read ON office_expenses FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS office_expenses_update ON office_expenses;
CREATE POLICY office_expenses_update ON office_expenses FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS other_expenses_insert ON other_expenses;
CREATE POLICY other_expenses_insert ON other_expenses FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS other_expenses_read ON other_expenses;
CREATE POLICY other_expenses_read ON other_expenses FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS other_expenses_update ON other_expenses;
CREATE POLICY other_expenses_update ON other_expenses FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));
DROP POLICY IF EXISTS overtime_records_access ON overtime_records;
CREATE POLICY overtime_records_access ON overtime_records FOR ALL TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER'])) WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER']));
DROP POLICY IF EXISTS payments_access ON payments;
CREATE POLICY payments_access ON payments FOR ALL TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS payroll_insert ON payroll;
CREATE POLICY payroll_insert ON payroll FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
DROP POLICY IF EXISTS payroll_select ON payroll;
CREATE POLICY payroll_select ON payroll FOR SELECT TO authenticated USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN']));
DROP POLICY IF EXISTS payroll_update ON payroll;
CREATE POLICY payroll_update ON payroll FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN']));
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
DROP POLICY IF EXISTS profit_loss_monthly_access ON profit_loss_monthly;
CREATE POLICY profit_loss_monthly_access ON profit_loss_monthly FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS quotations_access ON quotations;
CREATE POLICY quotations_access ON quotations FOR ALL TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS quotes_access ON quotes;
CREATE POLICY quotes_access ON quotes FOR ALL TO authenticated USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN'])) WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS revenue_records_access ON revenue_records;
CREATE POLICY revenue_records_access ON revenue_records FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN']));
DROP POLICY IF EXISTS salary_structures_access ON salary_structures;
CREATE POLICY salary_structures_access ON salary_structures FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']));
DROP POLICY IF EXISTS sale_targets_own ON sale_targets;
CREATE POLICY sale_targets_own ON sale_targets FOR ALL TO authenticated USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN']));
DROP POLICY IF EXISTS settlement_items_all ON settlement_items;
CREATE POLICY settlement_items_all ON settlement_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN'])))) WITH CHECK (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIEUHAN']))));
