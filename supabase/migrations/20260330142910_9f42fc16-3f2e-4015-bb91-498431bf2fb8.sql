-- 1. Create employee_permissions table
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted boolean DEFAULT true,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(employee_id, permission_key)
);

-- 2. RLS
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_read" ON public.employee_permissions
  FOR SELECT TO authenticated
  USING (
    employee_id = public.get_my_employee_id()
    OR public.has_any_role(auth.uid(), ARRAY['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'])
  );

CREATE POLICY "permissions_write" ON public.employee_permissions
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'SUPER_ADMIN']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'SUPER_ADMIN']));

-- 3. Function to get default permissions for a role
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      'customers.view',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'customers.view',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit'
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
$$;

-- 4. Indexes
CREATE INDEX idx_employee_permissions_employee ON public.employee_permissions(employee_id);
CREATE INDEX idx_employee_permissions_key ON public.employee_permissions(employee_id, permission_key);
