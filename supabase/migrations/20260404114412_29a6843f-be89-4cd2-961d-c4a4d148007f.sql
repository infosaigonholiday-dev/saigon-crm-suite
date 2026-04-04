-- Add UPDATE policy for contract-files bucket
CREATE POLICY "contract_files_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contract-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN'])
)
WITH CHECK (
  bucket_id = 'contract-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN'])
);

-- Add UPDATE policy for sop-files bucket
CREATE POLICY "sop_files_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sop-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
)
WITH CHECK (
  bucket_id = 'sop-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
);

-- Fix notifications admin policy - change from public to authenticated
DROP POLICY IF EXISTS "admin_full_access" ON public.notifications;
CREATE POLICY "admin_full_access" ON public.notifications FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));