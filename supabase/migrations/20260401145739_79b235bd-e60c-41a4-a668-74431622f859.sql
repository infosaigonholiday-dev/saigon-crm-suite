
-- ============ EMPLOYEES ============
DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS','KETOAN'])
  OR (
    department_id = get_my_department_id()
    AND has_any_role(auth.uid(), ARRAY['MANAGER','DIEUHAN'])
  )
);

-- ============ LEAVE_REQUESTS ============
DROP POLICY IF EXISTS "leave_requests_access" ON leave_requests;

CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (
    employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
    AND has_any_role(auth.uid(), ARRAY['MANAGER','DIEUHAN'])
  )
);

CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_HEAD','HR_MANAGER','HCNS'])
);

CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (
    employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
    AND has_any_role(auth.uid(), ARRAY['MANAGER','DIEUHAN'])
  )
)
WITH CHECK (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (
    employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
    AND has_any_role(auth.uid(), ARRAY['MANAGER','DIEUHAN'])
  )
);

CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);

-- ============ PAYROLL ============
DROP POLICY IF EXISTS "payroll_own" ON payroll;

CREATE POLICY "payroll_select" ON payroll FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS','KETOAN'])
);

CREATE POLICY "payroll_insert" ON payroll FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_HEAD','HR_MANAGER','HCNS'])
);

CREATE POLICY "payroll_update" ON payroll FOR UPDATE TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_HEAD','HR_MANAGER','HCNS','KETOAN'])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_HEAD','HR_MANAGER','HCNS','KETOAN'])
);

CREATE POLICY "payroll_delete" ON payroll FOR DELETE TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);
