
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;

CREATE POLICY "profiles_department_read" ON profiles
FOR SELECT USING (
  auth.uid() = id
  OR department_id = get_my_department_id()
);
