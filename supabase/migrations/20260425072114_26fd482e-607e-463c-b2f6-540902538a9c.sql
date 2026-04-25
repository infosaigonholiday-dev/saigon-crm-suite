-- ===== TABLE: b2b_tours =====
CREATE TABLE public.b2b_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_code text NOT NULL,
  target_market text,
  destination text,
  thang text,
  departure_date text,
  flight_dep_code text,
  flight_dep_time text,
  return_date text,
  flight_ret_code text,
  flight_ret_time text,
  price_adl bigint DEFAULT 0,
  price_chd bigint DEFAULT 0,
  price_inf bigint DEFAULT 0,
  commission_adl bigint DEFAULT 0,
  commission_chd bigint DEFAULT 0,
  commission_inf bigint DEFAULT 0,
  available_seats text,
  hold_seats text,
  notes text,
  visa_deadline text,
  itinerary_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_tours_tour_code ON public.b2b_tours(tour_code);
CREATE INDEX idx_b2b_tours_target_market ON public.b2b_tours(target_market);
CREATE INDEX idx_b2b_tours_thang ON public.b2b_tours(thang);

ALTER TABLE public.b2b_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_tours_select_all_authenticated"
ON public.b2b_tours FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "b2b_tours_admin_insert"
ON public.b2b_tours FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

CREATE POLICY "b2b_tours_admin_update"
ON public.b2b_tours FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

CREATE POLICY "b2b_tours_admin_delete"
ON public.b2b_tours FOR DELETE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_b2b_tours_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_b2b_tours_updated_at
BEFORE UPDATE ON public.b2b_tours
FOR EACH ROW EXECUTE FUNCTION public.update_b2b_tours_updated_at();

-- ===== TABLE: b2b_tour_logs =====
CREATE TABLE public.b2b_tour_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_code text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_name text,
  action text NOT NULL CHECK (action IN ('view_detail','download_itinerary','create_booking')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_b2b_tour_logs_user_created ON public.b2b_tour_logs(user_id, created_at DESC);
CREATE INDEX idx_b2b_tour_logs_tour_created ON public.b2b_tour_logs(tour_code, created_at DESC);

ALTER TABLE public.b2b_tour_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_tour_logs_insert_own"
ON public.b2b_tour_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "b2b_tour_logs_select_own"
ON public.b2b_tour_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "b2b_tour_logs_select_admin_manager"
ON public.b2b_tour_logs FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER']));

-- ===== Update default permissions function =====
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit','raw_contacts.delete',
        'b2b_tours.view','b2b_tours.logs'
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view','b2b_tours.logs'
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view','b2b_tours.logs'
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view'
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
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view'
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
        'settings.view',
        'b2b_tours.view'
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