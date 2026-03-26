-- Fix 1: Split employees ALL policy into granular policies
DROP POLICY IF EXISTS "employees_hcns" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

CREATE POLICY "employees_update_self" ON employees
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "employees_admin_write" ON employees
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- Fix 2: Restrict is_public on documents for non-admin users
DROP POLICY IF EXISTS "documents_access" ON documents;

CREATE POLICY "documents_read" ON documents
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR is_public = true OR has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "documents_write_admin" ON documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "documents_insert_own" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_public = false);

CREATE POLICY "documents_update_own" ON documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid() AND is_public = false);

CREATE POLICY "documents_delete_own" ON documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());