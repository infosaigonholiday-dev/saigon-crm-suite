-- Fix documents_read - require authentication even for public documents
DROP POLICY IF EXISTS "documents_read" ON public.documents;
CREATE POLICY "documents_read" ON public.documents FOR SELECT TO authenticated
USING ((uploaded_by = auth.uid()) OR (is_public = true));

-- Fix SOP files read - restrict to authenticated only (already private bucket)
DROP POLICY IF EXISTS "Authenticated users can read sop files" ON storage.objects;
CREATE POLICY "sop_files_read_authenticated" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sop-files');

-- Fix SOP files upload - restrict to ADMIN/HR_MANAGER only
DROP POLICY IF EXISTS "Authenticated users can upload sop files" ON storage.objects;
CREATE POLICY "sop_files_upload_admin_only" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sop-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
);