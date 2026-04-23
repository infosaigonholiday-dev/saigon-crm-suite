DROP POLICY IF EXISTS notes_read ON public.internal_notes;

CREATE POLICY notes_read ON public.internal_notes
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.uid() = ANY (mention_user_ids)
    OR public.get_profile_is_active(auth.uid()) = true
  );