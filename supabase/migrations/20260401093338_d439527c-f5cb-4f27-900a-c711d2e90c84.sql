
--- BOOKINGS: tạo lại policies (đã bị drop ở migration trước) ---
DROP POLICY IF EXISTS "bookings_sale" ON bookings;
DROP POLICY IF EXISTS "bookings_read" ON bookings;
DROP POLICY IF EXISTS "bookings_write" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "bookings_delete" ON bookings;

CREATE POLICY "bookings_read" ON bookings FOR SELECT TO authenticated
USING (
  sale_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','HR_HEAD'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER']))
);

CREATE POLICY "bookings_write" ON bookings FOR INSERT TO authenticated
WITH CHECK (
  sale_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
);

CREATE POLICY "bookings_update" ON bookings FOR UPDATE TO authenticated
USING (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']))
WITH CHECK (sale_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']));

CREATE POLICY "bookings_delete" ON bookings FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR']));

--- CUSTOMERS: tạo lại policies (đã bị drop ở migration trước) ---
DROP POLICY IF EXISTS "customers_own_dept" ON customers;
DROP POLICY IF EXISTS "customers_read" ON customers;
DROP POLICY IF EXISTS "customers_write" ON customers;

CREATE POLICY "customers_read" ON customers FOR SELECT TO authenticated
USING (
  assigned_sale_id = auth.uid()
  OR created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','HR_HEAD'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER']))
);

CREATE POLICY "customers_write" ON customers FOR ALL TO authenticated
USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']))
WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']));

--- LEADS: fix - bảng leads không có cột created_by, chỉ dùng assigned_to ---
DROP POLICY IF EXISTS "leads_assigned" ON leads;
DROP POLICY IF EXISTS "leads_read" ON leads;
DROP POLICY IF EXISTS "leads_write" ON leads;

CREATE POLICY "leads_read" ON leads FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER']))
);

CREATE POLICY "leads_write" ON leads FOR ALL TO authenticated
USING (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']))
WITH CHECK (assigned_to = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR']));
