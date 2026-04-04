
-- 1. Rename "Phòng Điều hành Tour" to "OP Outbound"
UPDATE departments
SET name = 'OP Outbound', code = 'OP_OUTBOUND'
WHERE id = 'fccb3292-3372-43ac-8da1-9860ce862e93';

-- 2. Delete 4 duplicate departments (all have 0 employees)
DELETE FROM departments WHERE id IN (
  '29196461-2be3-4e45-aeba-a77d5a5f9c1e',
  'e838fd0d-ace2-495d-9fb6-30d60f68c50f',
  'f8353df0-a9fb-4475-9c6c-f5ce8c456064',
  'b8a3edd7-89db-4ee4-9156-cc3c27a7d9c0'
);

-- 3. Update get_default_permissions_for_role to add tour_packages.view and contracts.view for HR_MANAGER
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_role
    WHEN 'ADMIN', 'SUPER_ADMIN' THEN
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
        'tour_packages.view','tour_packages.create',
        'itineraries.view','itineraries.create',
        'contracts.view',
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
        'tour_packages.view','tour_packages.create',
        'itineraries.view','itineraries.create',
        'contracts.view',
        'payments.view','payments.create',
        'staff.view',
        'leave.view','leave.approve',
        'payroll.view',
        'finance.view','finance.submit',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'DIEUHAN' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.approve',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view','payments.create','payments.edit',
        'finance.view','finance.create','finance.submit',
        'workflow.view','workflow.create',
        'suppliers.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view'
      ];
    WHEN 'HR_MANAGER' THEN
      RETURN ARRAY[
        'dashboard.view',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.submit',
        'settings.view',
        'workflow.view','workflow.create',
        'tour_packages.view',
        'contracts.view'
      ];
    WHEN 'KETOAN' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view',
        'bookings.view',
        'quotations.view',
        'itineraries.view',
        'contracts.view',
        'payments.view','payments.create','payments.edit',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.edit','finance.submit',
        'settings.view',
        'workflow.view','workflow.create',
        'suppliers.view','suppliers.create',
        'staff.view',
        'leave.view','leave.create'
      ];
    WHEN 'MKT' THEN
      RETURN ARRAY[
        'dashboard.view',
        'leads.view','leads.create','leads.edit',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'HCNS' THEN
      RETURN ARRAY[
        'dashboard.view',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.submit',
        'settings.view',
        'workflow.view','workflow.create'
      ];
    WHEN 'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'bookings.view','bookings.create',
        'quotations.view','quotations.create','quotations.edit',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'TOUR' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view',
        'bookings.view',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE','INTERN_SALE_INBOUND' THEN
      RETURN ARRAY[
        'dashboard.view',
        'customers.view','customers.create',
        'leads.view','leads.create',
        'bookings.view','bookings.create',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'INTERN_DIEUHAN' THEN
      RETURN ARRAY[
        'dashboard.view',
        'bookings.view',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'INTERN_MKT' THEN
      RETURN ARRAY[
        'dashboard.view',
        'leads.view','leads.create','leads.edit',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    WHEN 'INTERN_HCNS' THEN
      RETURN ARRAY[
        'dashboard.view',
        'staff.view',
        'leave.view','leave.create',
        'workflow.view',
        'payroll.view'
      ];
    WHEN 'INTERN_KETOAN' THEN
      RETURN ARRAY[
        'dashboard.view',
        'bookings.view',
        'payments.view',
        'leave.view','leave.create',
        'workflow.view',
        'staff.view',
        'payroll.view'
      ];
    ELSE
      RETURN ARRAY['dashboard.view'];
  END CASE;
END;
$$;
