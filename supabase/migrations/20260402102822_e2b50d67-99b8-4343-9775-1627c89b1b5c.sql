-- Add file columns to department_sops
ALTER TABLE public.department_sops
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create sop-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-files', 'sop-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read sop files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sop-files');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload sop files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sop-files');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete sop files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sop-files');