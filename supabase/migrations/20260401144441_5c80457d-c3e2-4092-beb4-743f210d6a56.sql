-- Add missing columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_due_at date,
  ADD COLUMN IF NOT EXISTS full_payment_due_at date,
  ADD COLUMN IF NOT EXISTS cancellation_terms text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- Drop old RLS policy and create expanded ones
DROP POLICY IF EXISTS "contracts_access" ON public.contracts;

CREATE POLICY "contracts_read" ON public.contracts FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN','KETOAN'])
);

CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN'])
  OR created_by = auth.uid()
);

CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN'])
)
WITH CHECK (
  created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN'])
);

CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- Create storage bucket for contract files
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-files', 'contract-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "contract_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contract-files');

CREATE POLICY "contract_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contract-files'
  AND (
    has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN'])
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "contract_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contract-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);