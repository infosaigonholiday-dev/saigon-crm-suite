
DROP FUNCTION IF EXISTS public.get_default_permissions_for_role(text);

CREATE FUNCTION public.get_default_permissions_for_role(p_role text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_role
    WHEN 'ADMIN' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit','customers.delete','customers.export',
        'leads.view','leads.create','leads.edit','leads.delete',
        'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
        'quotations.view','quotations.create','quotations.edit','quotations.delete',
        'tour_packages.view','tour_packages.create','tour_packages.edit','tour_packages.delete',
        'itineraries.view','itineraries.create','itineraries.edit','itineraries.delete',
        'accommodations.view','accommodations.create','accommodations.edit','accommodations.delete',
        'suppliers.view','suppliers.create','suppliers.edit','suppliers.delete',
        'contracts.view','contracts.create','contracts.edit','contracts.delete',
        'payments.view','payments.create','payments.edit','payments.delete',
        'staff.view','staff.create','staff.edit','staff.delete',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.edit','finance.submit',
        'workflow.view','workflow.create',
        'settings.view','settings.edit'
      ];
    WHEN 'GDKD' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create','bookings.edit','bookings.approve',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view','payments.create',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.approve',
        'payroll.view',
        'finance.view','finance.edit','finance.submit',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'MANAGER' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create','bookings.edit',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view','payments.create',
        'staff.view',
        'leave.view','leave.approve',
        'finance.submit',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'DIEUHAN' THEN
      RETURN ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.approve',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view','payments.create','payments.edit',
        'finance.view','finance.create','finance.submit',
        'workflow.view','workflow.create',
        'suppliers.view'
      ];
    WHEN 'HR_MANAGER' THEN
      RETURN ARRAY[
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.create','finance.submit',
        'settings.view',
        'workflow.view','workflow.create'
      ];
    WHEN 'KETOAN' THEN
      RETURN ARRAY[
        'customers.view',
        'bookings.view',
        'payments.view','payments.create','payments.edit',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.edit','finance.submit',
        'settings.view',
        'workflow.view','workflow.create',
        'suppliers.view','suppliers.create'
      ];
    WHEN 'MKT' THEN
      RETURN ARRAY[
        'leads.create','leads.edit',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'HCNS' THEN
      RETURN ARRAY[
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.create','finance.submit',
        'settings.view',
        'workflow.view','workflow.create'
      ];
    WHEN 'SALE_DOMESTIC' THEN
      RETURN ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'SALE_INBOUND' THEN
      RETURN ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'SALE_OUTBOUND' THEN
      RETURN ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'SALE_MICE' THEN
      RETURN ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'TOUR' THEN
      RETURN ARRAY[
        'customers.view',
        'bookings.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_DOMESTIC' THEN
      RETURN ARRAY[
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_OUTBOUND' THEN
      RETURN ARRAY[
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_MICE' THEN
      RETURN ARRAY[
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_INBOUND' THEN
      RETURN ARRAY[
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_DIEUHAN' THEN
      RETURN ARRAY[
        'bookings.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_MKT' THEN
      RETURN ARRAY[
        'leads.create','leads.edit',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_HCNS' THEN
      RETURN ARRAY[
        'staff.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    WHEN 'INTERN_KETOAN' THEN
      RETURN ARRAY[
        'bookings.view',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view'
      ];
    ELSE
      RETURN ARRAY[]::text[];
  END CASE;
END;
$$;
