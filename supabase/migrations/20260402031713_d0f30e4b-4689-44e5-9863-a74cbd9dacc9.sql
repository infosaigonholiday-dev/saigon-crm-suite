
-- 1. Update profiles_role_check constraint to include GDKD
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'ADMIN','SUPER_ADMIN','DIRECTOR','HCNS','HR_MANAGER','HR_HEAD','KETOAN',
  'MANAGER','GDKD','DIEUHAN',
  'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE',
  'TOUR','MKT','INTERN',
  'INTERN_DIEUHAN','INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE','INTERN_SALE_INBOUND',
  'INTERN_MKT','INTERN_HCNS','INTERN_KETOAN'
));

-- 2. Update get_default_permissions_for_role to add GDKD case
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete','customers.export',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.create','finance.edit','finance.submit',
      'settings.view','settings.edit',
      'sop.view','sop.create',
      'vendors.view'
    ]
    WHEN 'SUPER_ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete','customers.export',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.create','finance.edit','finance.submit',
      'settings.view','settings.edit',
      'sop.view','sop.create',
      'vendors.view'
    ]
    WHEN 'DIRECTOR' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit',
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.approve',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view',
      'sop.view','sop.create'
    ]
    WHEN 'HCNS' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.create','finance.submit',
      'settings.view',
      'sop.view','sop.create'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.submit',
      'settings.view',
      'sop.view','sop.create'
    ]
    WHEN 'HR_HEAD' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'bookings.view',
      'quotations.view',
      'payments.view',
      'finance.submit',
      'settings.view',
      'sop.view','sop.create',
      'vendors.view'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view',
      'sop.view',
      'vendors.view'
    ]
    WHEN 'MANAGER' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create',
      'employees.view',
      'leave.view','leave.approve',
      'finance.submit',
      'sop.view','sop.create'
    ]
    WHEN 'GDKD' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create',
      'employees.view',
      'leave.view','leave.approve',
      'finance.submit',
      'sop.view','sop.create'
    ]
    WHEN 'DIEUHAN' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit',
      'finance.create','finance.submit',
      'sop.view','sop.create',
      'vendors.view'
    ]
    WHEN 'SALE_DOMESTIC' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'SALE_INBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'SALE_OUTBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'SALE_MICE' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'TOUR' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'MKT' THEN ARRAY[
      'customers.view',
      'leads.view','leads.create','leads.edit',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN' THEN ARRAY[
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_DIEUHAN' THEN ARRAY[
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_SALE_DOMESTIC' THEN ARRAY[
      'customers.view',
      'leads.view',
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_SALE_OUTBOUND' THEN ARRAY[
      'customers.view',
      'leads.view',
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_SALE_MICE' THEN ARRAY[
      'customers.view',
      'leads.view',
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_SALE_INBOUND' THEN ARRAY[
      'customers.view',
      'leads.view',
      'bookings.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_MKT' THEN ARRAY[
      'customers.view',
      'leads.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_HCNS' THEN ARRAY[
      'employees.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    WHEN 'INTERN_KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view',
      'leave.view','leave.create',
      'sop.view'
    ]
    ELSE ARRAY[]::text[]
  END;
END;
$function$;

-- 3. Update all RLS policies that reference MANAGER to also include GDKD

-- customers_read
DROP POLICY IF EXISTS "customers_read" ON customers;
CREATE POLICY "customers_read" ON customers FOR SELECT TO authenticated
USING (
  assigned_sale_id = auth.uid()
  OR created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','HR_HEAD'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
);

-- bookings_read
DROP POLICY IF EXISTS "bookings_read" ON bookings;
CREATE POLICY "bookings_read" ON bookings FOR SELECT TO authenticated
USING (
  sale_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','HR_HEAD'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
);

-- booking_itineraries_read
DROP POLICY IF EXISTS "booking_itineraries_read" ON booking_itineraries;
CREATE POLICY "booking_itineraries_read" ON booking_itineraries FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','KETOAN','HR_HEAD','TOUR'])
);

-- booking_itineraries_insert
DROP POLICY IF EXISTS "booking_itineraries_insert" ON booking_itineraries;
CREATE POLICY "booking_itineraries_insert" ON booking_itineraries FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','TOUR'])
);

-- booking_itineraries_update
DROP POLICY IF EXISTS "booking_itineraries_update" ON booking_itineraries;
CREATE POLICY "booking_itineraries_update" ON booking_itineraries FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','TOUR'])
)
WITH CHECK (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid())
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','TOUR'])
);

-- booking_notes_read
DROP POLICY IF EXISTS "booking_notes_read" ON booking_special_notes;
CREATE POLICY "booking_notes_read" ON booking_special_notes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND (
    b.sale_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','TOUR'])
    OR (b.department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
  ))
);

-- booking_notes_write
DROP POLICY IF EXISTS "booking_notes_write" ON booking_special_notes;
CREATE POLICY "booking_notes_write" ON booking_special_notes FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','MANAGER','GDKD'])
  OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND b.sale_id = auth.uid())
);

-- kpi_read
DROP POLICY IF EXISTS "kpi_read" ON employee_kpis;
CREATE POLICY "kpi_read" ON employee_kpis FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
);

-- kpi_update
DROP POLICY IF EXISTS "kpi_update" ON employee_kpis;
CREATE POLICY "kpi_update" ON employee_kpis FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','GDKD','DIEUHAN']));

-- kpi_write
DROP POLICY IF EXISTS "kpi_write" ON employee_kpis;
CREATE POLICY "kpi_write" ON employee_kpis FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','GDKD','DIEUHAN']));

-- accommodations_write
DROP POLICY IF EXISTS "accommodations_write" ON accommodations;
CREATE POLICY "accommodations_write" ON accommodations FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- tour_packages_write
DROP POLICY IF EXISTS "tour_packages_write" ON tour_packages;
CREATE POLICY "tour_packages_write" ON tour_packages FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- tour_itineraries_write
DROP POLICY IF EXISTS "tour_itineraries_write" ON tour_itineraries;
CREATE POLICY "tour_itineraries_write" ON tour_itineraries FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- vendors_insert
DROP POLICY IF EXISTS "vendors_insert" ON vendors;
CREATE POLICY "vendors_insert" ON vendors FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- vendors_read
DROP POLICY IF EXISTS "vendors_read" ON vendors;
CREATE POLICY "vendors_read" ON vendors FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','KETOAN']));

-- vendors_update
DROP POLICY IF EXISTS "vendors_update" ON vendors;
CREATE POLICY "vendors_update" ON vendors FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- tour_services_insert
DROP POLICY IF EXISTS "tour_services_insert" ON tour_services;
CREATE POLICY "tour_services_insert" ON tour_services FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- tour_services_read
DROP POLICY IF EXISTS "tour_services_read" ON tour_services;
CREATE POLICY "tour_services_read" ON tour_services FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD','KETOAN']));

-- tour_services_update
DROP POLICY IF EXISTS "tour_services_update" ON tour_services;
CREATE POLICY "tour_services_update" ON tour_services FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','GDKD']));

-- sop_write (INSERT)
DROP POLICY IF EXISTS "sop_write" ON department_sops;
CREATE POLICY "sop_write" ON department_sops FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','GDKD','DIEUHAN']));

-- sop_ack_select
DROP POLICY IF EXISTS "sop_ack_select" ON sop_acknowledgements;
CREATE POLICY "sop_ack_select" ON sop_acknowledgements FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','GDKD','DIEUHAN'])
);

-- employees_select
DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS','KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
);

-- leave_requests_select
DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
);

-- leave_requests_update
DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
)
WITH CHECK (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','HCNS'])
  OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
);

-- leads_read
DROP POLICY IF EXISTS "leads_read" ON leads;
CREATE POLICY "leads_read" ON leads FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
);

-- transactions_read_ops
DROP POLICY IF EXISTS "transactions_read_ops" ON transactions;
CREATE POLICY "transactions_read_ops" ON transactions FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD'])
  AND type = 'EXPENSE' AND category = 'TOUR_EXPENSE'
);
