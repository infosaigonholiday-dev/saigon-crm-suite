
-- 1. Tạo bảng tour_guests
CREATE TABLE IF NOT EXISTS public.tour_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  id_number TEXT,
  id_type TEXT DEFAULT 'cccd' CHECK (id_type IN ('cccd','passport','cmnd')),
  phone TEXT,
  email TEXT,
  special_request TEXT,
  room_assignment TEXT,
  is_leader BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_guests_booking ON public.tour_guests(booking_id);

ALTER TABLE public.tour_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_guests_read" ON public.tour_guests;
CREATE POLICY "tour_guests_read" ON public.tour_guests 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tour_guests_write" ON public.tour_guests;
CREATE POLICY "tour_guests_write" ON public.tour_guests 
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE']));

-- 2. Bổ sung cột HDV và ngày khởi hành cho bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tour_guide_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tour_guide_note TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS departure_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_date DATE;

CREATE INDEX IF NOT EXISTS idx_bookings_departure ON public.bookings(departure_date) WHERE departure_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tour_guide ON public.bookings(tour_guide_id) WHERE tour_guide_id IS NOT NULL;
