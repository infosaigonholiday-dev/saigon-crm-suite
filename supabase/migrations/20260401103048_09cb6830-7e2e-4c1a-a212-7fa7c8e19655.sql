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
      'finance.view','finance.create','finance.edit','finance.submit',
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
      'finance.view','finance.edit','finance.submit',
      'settings.view'
    ]
    WHEN 'HCNS' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.create','finance.submit',
      'settings.view'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.submit',
      'settings.view'
    ]
    WHEN 'HR_HEAD' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'bookings.view',
      'quotations.view',
      'payments.view',
      'finance.submit',
      'settings.view'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
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