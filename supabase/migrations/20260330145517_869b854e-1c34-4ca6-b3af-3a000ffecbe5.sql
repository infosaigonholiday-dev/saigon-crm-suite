
CREATE TABLE public.booking_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  actual_date DATE,
  destination TEXT NOT NULL DEFAULT 'Chưa xác định',
  activities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.booking_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_itineraries_read" ON public.booking_itineraries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "booking_itineraries_write" ON public.booking_itineraries
  FOR ALL TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE','TOUR'])
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE','TOUR'])
  );
