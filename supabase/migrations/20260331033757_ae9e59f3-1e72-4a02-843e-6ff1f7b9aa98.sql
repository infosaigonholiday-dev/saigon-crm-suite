
-- 1. Drop old constraint and add HR_HEAD to profiles_role_check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HCNS', 'HR_MANAGER', 'HR_HEAD',
  'KETOAN', 'MANAGER', 'DIEUHAN',
  'SALE_DOMESTIC', 'SALE_INBOUND', 'SALE_OUTBOUND', 'SALE_MICE',
  'TOUR', 'MKT', 'INTERN'
));

-- 2. Update get_default_permissions_for_role to fix HCNS, HR_MANAGER, and add HR_HEAD
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
      'payroll.view','payroll.create'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit'
    ]
    WHEN 'HR_HEAD' THEN ARRAY[
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'bookings.view',
      'quotations.view',
      'payments.view'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit'
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

-- 3. Update prevent_role_change to allow HR_HEAD to change roles
CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (
      has_role(auth.uid(), 'ADMIN')
      OR has_role(auth.uid(), 'SUPER_ADMIN')
      OR has_role(auth.uid(), 'HR_MANAGER')
      OR has_role(auth.uid(), 'HR_HEAD')
      OR has_role(auth.uid(), 'HCNS')
    ) THEN
      RAISE EXCEPTION 'Chỉ Admin/HR mới được thay đổi chức vụ nhân viên';
    END IF;
  END IF;
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    IF NOT (
      has_role(auth.uid(), 'ADMIN')
      OR has_role(auth.uid(), 'SUPER_ADMIN')
      OR has_role(auth.uid(), 'HR_MANAGER')
      OR has_role(auth.uid(), 'HR_HEAD')
      OR has_role(auth.uid(), 'HCNS')
    ) THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Update RLS policies to include HR_HEAD

-- profiles: add HR_HEAD to admin policy
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HR_HEAD','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HR_HEAD','HCNS']));

-- employees: add HR_HEAD to all policies
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees FOR SELECT TO authenticated
  USING ((profile_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR','SUPER_ADMIN']));

DROP POLICY IF EXISTS employees_insert ON public.employees;
CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','HR_HEAD','DIRECTOR','SUPER_ADMIN']));

DROP POLICY IF EXISTS employees_update ON public.employees;
CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','HR_HEAD','DIRECTOR','SUPER_ADMIN','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HR_MANAGER','HR_HEAD','DIRECTOR','SUPER_ADMIN','HCNS']));

DROP POLICY IF EXISTS employees_delete ON public.employees;
CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD']));

-- employee_salaries: add HR_HEAD
DROP POLICY IF EXISTS employee_salaries_access ON public.employee_salaries;
CREATE POLICY employee_salaries_access ON public.employee_salaries FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- leave_requests: add HR_HEAD
DROP POLICY IF EXISTS leave_requests_access ON public.leave_requests;
CREATE POLICY leave_requests_access ON public.leave_requests FOR ALL TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- payroll: add HR_HEAD
DROP POLICY IF EXISTS payroll_own ON public.payroll;
CREATE POLICY payroll_own ON public.payroll FOR ALL TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- insurance_records: add HR_HEAD
DROP POLICY IF EXISTS insurance_records_access ON public.insurance_records;
CREATE POLICY insurance_records_access ON public.insurance_records FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- overtime_records: add HR_HEAD
DROP POLICY IF EXISTS overtime_records_access ON public.overtime_records;
CREATE POLICY overtime_records_access ON public.overtime_records FOR ALL TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- commission_records: add HR_HEAD
DROP POLICY IF EXISTS commission_records_access ON public.commission_records;
CREATE POLICY commission_records_access ON public.commission_records FOR ALL TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- commission_rules: add HR_HEAD
DROP POLICY IF EXISTS commission_rules_access ON public.commission_rules;
CREATE POLICY commission_rules_access ON public.commission_rules FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- business_travel: add HR_HEAD
DROP POLICY IF EXISTS business_travel_access ON public.business_travel;
CREATE POLICY business_travel_access ON public.business_travel FOR ALL TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']))
  WITH CHECK ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

-- career_paths: add HR_HEAD
DROP POLICY IF EXISTS career_paths_read ON public.career_paths;
CREATE POLICY career_paths_read ON public.career_paths FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_MANAGER','HR_HEAD','DIRECTOR']));

DROP POLICY IF EXISTS career_paths_write ON public.career_paths;
CREATE POLICY career_paths_write ON public.career_paths FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']));

-- leave_policies: add HR_HEAD
DROP POLICY IF EXISTS leave_policies_write ON public.leave_policies;
CREATE POLICY leave_policies_write ON public.leave_policies FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']));

-- benefits_policies: add HR_HEAD
DROP POLICY IF EXISTS benefits_policies_write ON public.benefits_policies;
CREATE POLICY benefits_policies_write ON public.benefits_policies FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','HR_HEAD']));

-- employee_permissions: add HR_HEAD to read
DROP POLICY IF EXISTS permissions_read ON public.employee_permissions;
CREATE POLICY permissions_read ON public.employee_permissions FOR SELECT TO authenticated
  USING ((employee_id = get_my_employee_id()) OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD']));
