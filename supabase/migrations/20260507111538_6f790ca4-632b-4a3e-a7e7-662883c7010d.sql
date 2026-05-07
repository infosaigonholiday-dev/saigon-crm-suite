
-- Fix 1: tour_guests SELECT — restrict to operational roles or sale who owns the booking
DROP POLICY IF EXISTS tour_guests_read ON public.tour_guests;

CREATE POLICY tour_guests_read ON public.tour_guests
FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS','KETOAN','OPS','ACC']::text[])
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = tour_guests.booking_id
      AND b.sale_id = auth.uid()
  )
);

-- Fix 2: employee-avatars — enforce path ownership (folder = auth.uid())
DROP POLICY IF EXISTS employee_avatars_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS employee_avatars_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS employee_avatars_authenticated_delete ON storage.objects;

CREATE POLICY employee_avatars_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']::text[])
  )
);

CREATE POLICY employee_avatars_owner_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']::text[])
  )
)
WITH CHECK (
  bucket_id = 'employee-avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']::text[])
  )
);

CREATE POLICY employee_avatars_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']::text[])
  )
);
