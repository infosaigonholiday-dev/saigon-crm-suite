-- Fix 1: Restrict employee self-update to safe personal fields only
DROP POLICY IF EXISTS "employees_update_self" ON employees;

CREATE POLICY "employees_update_self" ON employees
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND level = (SELECT e.level FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND status = (SELECT e.status FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND department_id IS NOT DISTINCT FROM (SELECT e.department_id FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND employment_type IS NOT DISTINCT FROM (SELECT e.employment_type FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND position IS NOT DISTINCT FROM (SELECT e.position FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND employee_code = (SELECT e.employee_code FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
    AND probation_end_date IS NOT DISTINCT FROM (SELECT e.probation_end_date FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1)
  );

-- Fix 2: Restrict career_paths read to HR/management only
DROP POLICY IF EXISTS "career_paths_read" ON career_paths;

CREATE POLICY "career_paths_read" ON career_paths
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));