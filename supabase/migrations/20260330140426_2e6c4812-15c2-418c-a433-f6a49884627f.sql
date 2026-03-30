
-- 1. Tour Packages
CREATE TABLE public.tour_packages (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  destination text[] DEFAULT '{}',
  duration_days integer NOT NULL DEFAULT 1,
  duration_nights integer DEFAULT 0,
  min_pax integer DEFAULT 1,
  max_pax integer DEFAULT 50,
  base_price numeric DEFAULT 0,
  currency text DEFAULT 'VND',
  description text,
  inclusions text[] DEFAULT '{}',
  exclusions text[] DEFAULT '{}',
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_packages_read" ON public.tour_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tour_packages_write" ON public.tour_packages
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']));

-- 2. Accommodations
CREATE TABLE public.accommodations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'HOTEL',
  location text NOT NULL,
  city text,
  country text DEFAULT 'Việt Nam',
  rating numeric DEFAULT 3,
  contact_phone text,
  contact_email text,
  website text,
  amenities text[] DEFAULT '{}',
  notes text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accommodations_read" ON public.accommodations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "accommodations_write" ON public.accommodations
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']));

-- 3. Tour Itineraries
CREATE TABLE public.tour_itineraries (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tour_package_id uuid NOT NULL REFERENCES public.tour_packages(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text,
  activities jsonb DEFAULT '[]',
  accommodation_id uuid REFERENCES public.accommodations(id) ON DELETE SET NULL,
  meals_included text[] DEFAULT '{}',
  transportation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tour_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_itineraries_read" ON public.tour_itineraries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tour_itineraries_write" ON public.tour_itineraries
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER']));

-- 4. Quotations (separate from existing quotes table)
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  tour_package_id uuid REFERENCES public.tour_packages(id) ON DELETE SET NULL,
  valid_from date,
  valid_until date,
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'VND',
  status text DEFAULT 'DRAFT',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_access" ON public.quotations
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN']))
  WITH CHECK (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN']));
