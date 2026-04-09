
-- Bảng raw_contacts
CREATE TABLE IF NOT EXISTS public.raw_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  phone text NOT NULL,
  email text,
  company_name text,
  contact_type text DEFAULT 'personal' CHECK (contact_type IN ('personal','b2b')),
  source text,
  note text,
  status text DEFAULT 'new' CHECK (status IN ('new','called_no_answer','called_not_interested','called_interested','converted_to_lead','duplicate','invalid')),
  call_count integer DEFAULT 0,
  last_called_at timestamptz,
  assigned_to uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id) NOT NULL DEFAULT auth.uid(),
  department_id uuid REFERENCES public.departments(id),
  converted_lead_id uuid REFERENCES public.leads(id),
  created_at timestamptz DEFAULT now()
);

-- Unique phone index (exclude invalid/duplicate)
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_contacts_phone ON public.raw_contacts(phone) WHERE status NOT IN ('duplicate','invalid');

-- RLS
ALTER TABLE public.raw_contacts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access" ON public.raw_contacts
FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- Read: own + assigned + dept managers + GDKD
CREATE POLICY "raw_contacts_read" ON public.raw_contacts
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
);

-- Insert: own data only
CREATE POLICY "raw_contacts_insert" ON public.raw_contacts
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Update: own + assigned + dept managers
CREATE POLICY "raw_contacts_update" ON public.raw_contacts
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
)
WITH CHECK (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
);

-- Update get_default_permissions_for_role to include raw_contacts
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit'
      ];
    WHEN 'INTERN_DIEUHAN' THEN
      perms := ARRAY[
        'customers.view',
        'leads.view',
        'bookings.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view'
      ];
    WHEN 'INTERN_MKT' THEN
      perms := ARRAY[
        'customers.view',
        'leads.view',
        'workflow.view'
      ];
    WHEN 'INTERN_HCNS' THEN
      perms := ARRAY[
        'staff.view',
        'leave.view',
        'workflow.view'
      ];
    WHEN 'INTERN_KETOAN' THEN
      perms := ARRAY[
        'finance.view',
        'payments.view',
        'workflow.view'
      ];
    ELSE
      perms := ARRAY[]::text[];
  END CASE;
  RETURN perms;
END;
$$;
