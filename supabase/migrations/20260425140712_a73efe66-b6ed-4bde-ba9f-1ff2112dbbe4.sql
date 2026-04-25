
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tour_name_manual text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tour_package_id uuid REFERENCES public.tour_packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tour_package_id ON public.bookings(tour_package_id);
