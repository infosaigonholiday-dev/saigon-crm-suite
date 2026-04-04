-- Fix SOP files DELETE policy - chỉ ADMIN/HR_MANAGER mới xóa được
DROP POLICY IF EXISTS "Authenticated users can delete sop files" ON storage.objects;
CREATE POLICY "sop_files_delete_admin_only" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sop-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER'])
);