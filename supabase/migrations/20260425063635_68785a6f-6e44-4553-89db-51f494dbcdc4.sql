-- 1. Update get_default_permissions_for_role to include settings.view for all INTERN roles
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  perms text[];
BEGIN
  CASE p_role
    WHEN 'ADMIN', 'SUPER_ADMIN' THEN
      perms := ARRAY[
        'customers.view','customers.create','customers.edit','customers.delete','customers.export',
        'leads.view','leads.create','leads.edit','leads.delete',
        'quotations.view','quotations.create','quotations.edit','quotations.delete',
        'bookings.view','bookings.create','bookings.edit','bookings.delete',
        'payments.view','payments.create','payments.edit','payments.delete',
        'contracts.view','contracts.create','contracts.edit','contracts.delete','contracts.approve',
        'staff.view','staff.create','staff.edit','staff.delete',
        'leave.view','leave.create','leave.edit','leave.approve','leave.delete',
        'payroll.view','payroll.create','payroll.edit','payroll.delete',
        'finance.view','finance.create','finance.edit','finance.approve','finance.delete','finance.submit',
        'settings.view','settings.edit',
        'tour_packages.view','tour_packages.create','tour_packages.edit','tour_packages.delete',
        'itineraries.view','itineraries.create','itineraries.edit','itineraries.delete',
        'accommodations.view','accommodations.create','accommodations.edit','accommodations.delete',
        'suppliers.view','suppliers.create','suppliers.edit','suppliers.delete',
        'workflow.view','workflow.create','workflow.edit','workflow.delete',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit','raw_contacts.delete'
      ];
    WHEN 'GDKD' THEN
      perms := ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.approve',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'workflow.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit'
      ];
    WHEN 'MANAGER' THEN
      perms := ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'staff.view',
        'leave.view','leave.approve',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'workflow.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit'
      ];
    WHEN 'DIEUHAN' THEN
      perms := ARRAY[
        'customers.view','customers.create',
        'leads.view','leads.create',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'suppliers.view','suppliers.create','suppliers.edit',
        'workflow.view','workflow.create','workflow.edit'
      ];
    WHEN 'HR_MANAGER' THEN
      perms := ARRAY[
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.edit','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.submit',
        'suppliers.view',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit',
        'workflow.view','workflow.create','workflow.edit'
      ];
    WHEN 'KETOAN' THEN
      perms := ARRAY[
        'finance.view','finance.create','finance.edit','finance.approve',
        'payments.view','payments.create','payments.edit',
        'payroll.view','payroll.create','payroll.edit',
        'suppliers.view','suppliers.create','suppliers.edit',
        'bookings.view',
        'contracts.view',
        'customers.view',
        'workflow.view'
      ];
    WHEN 'MKT' THEN
      perms := ARRAY[
        'customers.view',
        'leads.view','leads.create','leads.edit',
        'workflow.view'
      ];
    WHEN 'HCNS' THEN
      perms := ARRAY[
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.edit','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.submit',
        'suppliers.view',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit',
        'workflow.view'
      ];
    WHEN 'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE' THEN
      perms := ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit',
        'payments.view',
        'contracts.view',
        'tour_packages.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit'
      ];
    WHEN 'TOUR' THEN
      perms := ARRAY[
        'bookings.view',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE','INTERN_SALE_INBOUND' THEN
      perms := ARRAY[
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create',
        'bookings.view',
        'tour_packages.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'settings.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit'
      ];
    WHEN 'INTERN_DIEUHAN' THEN
      perms := ARRAY[
        'customers.view',
        'leads.view',
        'bookings.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'settings.view'
      ];
    WHEN 'INTERN_MKT' THEN
      perms := ARRAY[
        'customers.view',
        'leads.view',
        'workflow.view',
        'settings.view'
      ];
    WHEN 'INTERN_HCNS' THEN
      perms := ARRAY[
        'staff.view',
        'leave.view',
        'workflow.view',
        'settings.view'
      ];
    WHEN 'INTERN_KETOAN' THEN
      perms := ARRAY[
        'finance.view',
        'payments.view',
        'workflow.view',
        'settings.view'
      ];
    ELSE
      perms := ARRAY[]::text[];
  END CASE;
  RETURN perms;
END;
$function$;