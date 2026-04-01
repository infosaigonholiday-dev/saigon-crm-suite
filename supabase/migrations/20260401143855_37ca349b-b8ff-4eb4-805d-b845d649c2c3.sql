CREATE TABLE IF NOT EXISTS public.booking_special_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  note_type text NOT NULL CHECK (note_type IN ('health','request','elderly_child','event','operation','finance')),
  content text NOT NULL,
  related_guest text,
  priority text DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_special_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_notes_read" ON public.booking_special_notes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.id = booking_special_notes.booking_id AND (
    b.sale_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','KETOAN','TOUR'])
    OR (b.department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER']))
  )
));

CREATE POLICY "booking_notes_write" ON public.booking_special_notes FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','DIRECTOR','MANAGER'])
  OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_special_notes.booking_id AND b.sale_id = auth.uid()));

CREATE POLICY "booking_notes_delete" ON public.booking_special_notes FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));