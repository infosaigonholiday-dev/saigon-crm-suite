-- Fix profiles_self_update: use subquery instead of auth.jwt() ->> 'role'
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );