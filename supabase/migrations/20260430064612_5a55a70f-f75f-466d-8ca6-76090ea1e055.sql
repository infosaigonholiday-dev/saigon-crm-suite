-- Add multi-file receipt support
ALTER TABLE settlement_items ADD COLUMN IF NOT EXISTS receipt_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE budget_estimate_items ADD COLUMN IF NOT EXISTS receipt_urls TEXT[] NOT NULL DEFAULT '{}';

-- Create private bucket for finance receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-receipts', 'finance-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket: any authenticated user can read/upload/update/delete
DROP POLICY IF EXISTS "finance_receipts_authenticated_read" ON storage.objects;
CREATE POLICY "finance_receipts_authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'finance-receipts');

DROP POLICY IF EXISTS "finance_receipts_authenticated_insert" ON storage.objects;
CREATE POLICY "finance_receipts_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'finance-receipts');

DROP POLICY IF EXISTS "finance_receipts_authenticated_update" ON storage.objects;
CREATE POLICY "finance_receipts_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'finance-receipts');

DROP POLICY IF EXISTS "finance_receipts_authenticated_delete" ON storage.objects;
CREATE POLICY "finance_receipts_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'finance-receipts');