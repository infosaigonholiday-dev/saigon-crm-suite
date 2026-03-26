-- Fix: Change all public-role policies to authenticated

-- 1. employees
DROP POLICY IF EXISTS "employees_hcns" ON employees;
CREATE POLICY "employees_hcns" ON employees
  FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (profile_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- 2. payroll
DROP POLICY IF EXISTS "payroll_own" ON payroll;
CREATE POLICY "payroll_own" ON payroll
  FOR ALL TO authenticated
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR'])
  )
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- 3. customers
DROP POLICY IF EXISTS "customers_own_dept" ON customers;
CREATE POLICY "customers_own_dept" ON customers
  FOR ALL TO authenticated
  USING (assigned_sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']))
  WITH CHECK (assigned_sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']));

-- 4. leads
DROP POLICY IF EXISTS "leads_assigned" ON leads;
CREATE POLICY "leads_assigned" ON leads
  FOR ALL TO authenticated
  USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']))
  WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']));

-- 5. bookings
DROP POLICY IF EXISTS "bookings_sale" ON bookings;
CREATE POLICY "bookings_sale" ON bookings
  FOR ALL TO authenticated
  USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']))
  WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']));

-- 6. sale_targets
DROP POLICY IF EXISTS "sale_targets_own" ON sale_targets;
CREATE POLICY "sale_targets_own" ON sale_targets
  FOR ALL TO authenticated
  USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']));

-- 7. audit_logs
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));