-- 1. Fix profiles_admin_all: dùng has_any_role thay vì subquery
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

-- 2. Fix profiles_self_update: bỏ subquery, dùng auth.uid() = id
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Fix employees RLS policies that also query profiles directly
DROP POLICY IF EXISTS employees_select ON employees;
CREATE POLICY employees_select ON employees
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','DIRECTOR','SUPER_ADMIN'])
  );

DROP POLICY IF EXISTS employees_insert ON employees;
CREATE POLICY employees_insert ON employees
  FOR INSERT TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','DIRECTOR','SUPER_ADMIN'])
  );

DROP POLICY IF EXISTS employees_update ON employees;
CREATE POLICY employees_update ON employees
  FOR UPDATE TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','DIRECTOR','SUPER_ADMIN','HCNS'])
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','DIRECTOR','SUPER_ADMIN','HCNS'])
  );

DROP POLICY IF EXISTS employees_delete ON employees;
CREATE POLICY employees_delete ON employees
  FOR DELETE TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR'])
  );