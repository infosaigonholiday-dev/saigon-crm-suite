-- Add business tracking columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_address text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tour_interest text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS issue_faced text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS result text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_staff_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_staff_phone text;

-- Add business tracking columns to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tour_interest text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_status text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS issue_faced text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS result text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_person_phone text;

-- Update permissions function with vendors.view and customers.export
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