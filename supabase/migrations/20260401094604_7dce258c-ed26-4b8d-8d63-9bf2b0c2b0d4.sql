-- 1. Update get_default_permissions_for_role: remove .delete from HR_MANAGER and HR_HEAD
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.edit',
      'settings.view','settings.edit'
    ]
    WHEN 'SUPER_ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.edit',
      'settings.view','settings.edit'
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
      'finance.view','finance.edit',
      'settings.view'
    ]
    WHEN 'HCNS' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create',
      'payroll.view','payroll.create',
      'settings.view'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'settings.view'
    ]
    WHEN 'HR_HEAD' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'bookings.view',
      'quotations.view',
      'payments.view',
      'settings.view'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit',
      'settings.view'
    ]
    WHEN 'MANAGER' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create',
      'employees.view',
      'leave.view','leave.approve'
    ]
    WHEN 'DIEUHAN' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit'
    ]
    WHEN 'SALE_DOMESTIC' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_INBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_OUTBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_MICE' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'TOUR' THEN ARRAY[
      'customers.view',
      'bookings.view'
    ]
    WHEN 'MKT' THEN ARRAY[
      'customers.view',
      'leads.view','leads.create','leads.edit'
    ]
    WHEN 'INTERN' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;
END;
$function$;

-- 2. Tighten bookings DELETE: only ADMIN/SUPER_ADMIN
DROP POLICY IF EXISTS bookings_delete ON bookings;
CREATE POLICY bookings_delete ON bookings FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 3. Tighten employees DELETE: only ADMIN/SUPER_ADMIN
DROP POLICY IF EXISTS employees_delete ON employees;
CREATE POLICY employees_delete ON employees FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 4. Split customers: change ALL write to INSERT+UPDATE only, add separate DELETE
DROP POLICY IF EXISTS customers_write ON customers;
CREATE POLICY customers_insert ON customers FOR INSERT TO authenticated
  WITH CHECK (
    (assigned_sale_id = auth.uid()) OR (created_by = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  );
CREATE POLICY customers_update ON customers FOR UPDATE TO authenticated
  USING (
    (assigned_sale_id = auth.uid()) OR (created_by = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  )
  WITH CHECK (
    (assigned_sale_id = auth.uid()) OR (created_by = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  );
CREATE POLICY customers_delete ON customers FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 5. Split leads: change ALL write to INSERT+UPDATE only, add separate DELETE
DROP POLICY IF EXISTS leads_write ON leads;
CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated
  WITH CHECK (
    (assigned_to = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  );
CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated
  USING (
    (assigned_to = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  )
  WITH CHECK (
    (assigned_to = auth.uid())
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR'])
  );
CREATE POLICY leads_delete ON leads FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 6. Split booking_itineraries: change ALL write to INSERT+UPDATE, add DELETE
DROP POLICY IF EXISTS booking_itineraries_write ON booking_itineraries;
CREATE POLICY booking_itineraries_insert ON booking_itineraries FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','TOUR'])
  );
CREATE POLICY booking_itineraries_update ON booking_itineraries FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','TOUR'])
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','TOUR'])
  );
CREATE POLICY booking_itineraries_delete ON booking_itineraries FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 7. Add DELETE policies for financial/operational tables
-- tour_services: need to check if ALL policy exists first
DO $$
BEGIN
  -- Drop existing ALL policies that cover DELETE, then create specific DELETE
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_services' AND policyname = 'tour_services_write') THEN
    EXECUTE 'DROP POLICY tour_services_write ON tour_services';
    EXECUTE 'CREATE POLICY tour_services_insert ON tour_services FOR INSERT TO authenticated
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
    EXECUTE 'CREATE POLICY tour_services_update ON tour_services FOR UPDATE TO authenticated
      USING (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tour_services' AND policyname = 'tour_services_access') THEN
    EXECUTE 'DROP POLICY tour_services_access ON tour_services';
    EXECUTE 'CREATE POLICY tour_services_read ON tour_services FOR SELECT TO authenticated
      USING (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'',''KETOAN'']))';
    EXECUTE 'CREATE POLICY tour_services_insert ON tour_services FOR INSERT TO authenticated
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
    EXECUTE 'CREATE POLICY tour_services_update ON tour_services FOR UPDATE TO authenticated
      USING (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
  END IF;
END $$;
DROP POLICY IF EXISTS tour_services_delete ON tour_services;
CREATE POLICY tour_services_delete ON tour_services FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- transactions: split access → read + insert + update + delete
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'transactions_access') THEN
    EXECUTE 'DROP POLICY transactions_access ON transactions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'transactions_write') THEN
    EXECUTE 'DROP POLICY transactions_write ON transactions';
  END IF;
END $$;
DROP POLICY IF EXISTS transactions_read ON transactions;
DROP POLICY IF EXISTS transactions_insert ON transactions;
DROP POLICY IF EXISTS transactions_update ON transactions;
DROP POLICY IF EXISTS transactions_delete ON transactions;
CREATE POLICY transactions_read ON transactions FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','DIEUHAN']));
CREATE POLICY transactions_insert ON transactions FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','DIEUHAN']));
CREATE POLICY transactions_update ON transactions FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','DIEUHAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','DIEUHAN']));
CREATE POLICY transactions_delete ON transactions FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- office_expenses
DROP POLICY IF EXISTS office_expenses_access ON office_expenses;
CREATE POLICY office_expenses_read ON office_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY office_expenses_insert ON office_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY office_expenses_update ON office_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY office_expenses_delete ON office_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- marketing_expenses
DROP POLICY IF EXISTS marketing_expenses_access ON marketing_expenses;
CREATE POLICY marketing_expenses_read ON marketing_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','MKT']));
CREATE POLICY marketing_expenses_insert ON marketing_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','MKT']));
CREATE POLICY marketing_expenses_update ON marketing_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','MKT']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR','MKT']));
CREATE POLICY marketing_expenses_delete ON marketing_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- other_expenses
DROP POLICY IF EXISTS other_expenses_access ON other_expenses;
CREATE POLICY other_expenses_read ON other_expenses FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY other_expenses_insert ON other_expenses FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY other_expenses_update ON other_expenses FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR']));
CREATE POLICY other_expenses_delete ON other_expenses FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- vendors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'vendors_write') THEN
    EXECUTE 'DROP POLICY vendors_write ON vendors';
    EXECUTE 'CREATE POLICY vendors_insert ON vendors FOR INSERT TO authenticated
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
    EXECUTE 'CREATE POLICY vendors_update ON vendors FOR UPDATE TO authenticated
      USING (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'vendors_access') THEN
    EXECUTE 'DROP POLICY vendors_access ON vendors';
    EXECUTE 'CREATE POLICY vendors_read ON vendors FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY vendors_insert ON vendors FOR INSERT TO authenticated
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
    EXECUTE 'CREATE POLICY vendors_update ON vendors FOR UPDATE TO authenticated
      USING (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))
      WITH CHECK (has_any_role(auth.uid(), ARRAY[''ADMIN'',''SUPER_ADMIN'',''DIRECTOR'',''DIEUHAN'',''MANAGER'']))';
  END IF;
END $$;
DROP POLICY IF EXISTS vendors_delete ON vendors;
CREATE POLICY vendors_delete ON vendors FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));