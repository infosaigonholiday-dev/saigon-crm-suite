
-- Fix C9: Tighten employee_kpis DELETE policy
DROP POLICY IF EXISTS "employee_kpis_delete" ON employee_kpis;
CREATE POLICY "employee_kpis_delete" ON employee_kpis FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- Fix C9: Tighten documents DELETE policy
DROP POLICY IF EXISTS "documents_delete" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "documents_delete" ON documents FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- Fix E13: Sync DB function with client DEFAULT_PERMISSIONS (add sop.view, sop.create)
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
      'finance.view','finance.create','finance.edit','finance.submit',
      'settings.view','settings.edit',
      'sop.view','sop.create'
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
      'finance.view','finance.create','finance.edit','finance.submit',
      'settings.view','settings.edit',
      'sop.view','sop.create'
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
      'sop.view','sop.create'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view',
      'sop.view'
    ]
    WHEN 'MANAGER' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create',
      'employees.view',
      'leave.view','leave.approve',
      'sop.view','sop.create'
    ]
    WHEN 'DIEUHAN' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit',
      'sop.view','sop.create'
    ]
    WHEN 'SALE_DOMESTIC' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'sop.view'
    ]
    WHEN 'SALE_INBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'sop.view'
    ]
    WHEN 'SALE_OUTBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'sop.view'
    ]
    WHEN 'SALE_MICE' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view',
      'sop.view'
    ]
    WHEN 'TOUR' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'sop.view'
    ]
    WHEN 'MKT' THEN ARRAY[
      'customers.view',
      'leads.view','leads.create','leads.edit',
      'sop.view'
    ]
    WHEN 'INTERN' THEN ARRAY[
      'sop.view'
    ]
    ELSE ARRAY[]::text[]
  END;
END;
$function$;
