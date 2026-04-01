-- 1. Fix critical: profiles_self_update allows role escalation
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_active FROM profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_profile_role(auth.uid())
    AND is_active = get_profile_is_active(auth.uid())
  );

-- 2. Fix booking_itineraries: restrict read to booking owners + privileged roles
DROP POLICY IF EXISTS "booking_itineraries_read" ON booking_itineraries;

CREATE POLICY "booking_itineraries_read" ON booking_itineraries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_itineraries.booking_id
        AND b.sale_id = auth.uid()
    )
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','KETOAN','HR_HEAD','TOUR'])
  );

-- 3. Fix booking_itineraries: restrict write to booking owners + privileged roles
DROP POLICY IF EXISTS "booking_itineraries_write" ON booking_itineraries;

CREATE POLICY "booking_itineraries_write" ON booking_itineraries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_itineraries.booking_id
        AND b.sale_id = auth.uid()
    )
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','TOUR'])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_itineraries.booking_id
        AND b.sale_id = auth.uid()
    )
    OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','MANAGER','TOUR'])
  );