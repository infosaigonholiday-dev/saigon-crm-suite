-- 1. Extend internal_notes entity_type constraint to include 'payroll' and 'candidate'
ALTER TABLE public.internal_notes DROP CONSTRAINT IF EXISTS internal_notes_entity_type_check;
ALTER TABLE public.internal_notes ADD CONSTRAINT internal_notes_entity_type_check
  CHECK (entity_type = ANY (ARRAY['raw_contact'::text, 'lead'::text, 'customer'::text, 'booking'::text, 'quotation'::text, 'contract'::text, 'payment'::text, 'employee'::text, 'finance'::text, 'payroll'::text, 'candidate'::text]));

-- 2. Create private cv-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-files', 'cv-files', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for cv-files (HR/HCNS/ADMIN read+write)
DROP POLICY IF EXISTS "cv_files_hr_select" ON storage.objects;
DROP POLICY IF EXISTS "cv_files_hr_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_files_hr_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_files_hr_delete" ON storage.objects;

CREATE POLICY "cv_files_hr_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cv-files' AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
CREATE POLICY "cv_files_hr_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-files' AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
CREATE POLICY "cv_files_hr_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cv-files' AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));
CREATE POLICY "cv_files_hr_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cv-files' AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));