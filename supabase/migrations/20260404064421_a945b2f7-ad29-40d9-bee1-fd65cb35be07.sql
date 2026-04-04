
-- =============================================
-- FIX: Change all policies from TO public → TO authenticated
-- on 8 sensitive HR/payroll tables
-- =============================================

-- ─── EMPLOYEES (4 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.employees;
CREATE POLICY "admin_full_access" ON public.employees FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'HR_MANAGER'));

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

-- ─── PAYROLL (4 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.payroll;
CREATE POLICY "admin_full_access" ON public.payroll FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT TO authenticated
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN'])
  );

DROP POLICY IF EXISTS "payroll_insert" ON public.payroll;
CREATE POLICY "payroll_insert" ON public.payroll FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

DROP POLICY IF EXISTS "payroll_update" ON public.payroll;
CREATE POLICY "payroll_update" ON public.payroll FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN']));

-- ─── EMPLOYEE_SALARIES (2 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.employee_salaries;
CREATE POLICY "admin_full_access" ON public.employee_salaries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "employee_salaries_access" ON public.employee_salaries;
CREATE POLICY "employee_salaries_access" ON public.employee_salaries FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- ─── INSURANCE_RECORDS (2 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.insurance_records;
CREATE POLICY "admin_full_access" ON public.insurance_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "insurance_records_access" ON public.insurance_records;
CREATE POLICY "insurance_records_access" ON public.insurance_records FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- ─── LEAVE_REQUESTS (4 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.leave_requests;
CREATE POLICY "admin_full_access" ON public.leave_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
        AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
CREATE POLICY "leave_requests_insert" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
  );

DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
CREATE POLICY "leave_requests_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
        AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  )
  WITH CHECK (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
        AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

-- ─── COMMISSION_RECORDS (2 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.commission_records;
CREATE POLICY "admin_full_access" ON public.commission_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "commission_records_access" ON public.commission_records;
CREATE POLICY "commission_records_access" ON public.commission_records FOR ALL TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- ─── OVERTIME_RECORDS (2 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.overtime_records;
CREATE POLICY "admin_full_access" ON public.overtime_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "overtime_records_access" ON public.overtime_records;
CREATE POLICY "overtime_records_access" ON public.overtime_records FOR ALL TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- ─── BUSINESS_TRAVEL (2 policies) ───
DROP POLICY IF EXISTS "admin_full_access" ON public.business_travel;
CREATE POLICY "admin_full_access" ON public.business_travel FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "business_travel_access" ON public.business_travel;
CREATE POLICY "business_travel_access" ON public.business_travel FOR ALL TO authenticated
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));
