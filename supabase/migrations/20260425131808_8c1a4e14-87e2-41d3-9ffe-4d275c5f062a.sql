
ALTER TABLE public.budget_estimates ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
ALTER TABLE public.budget_settlements ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'KETOAN')
  OR (submitted_by = auth.uid()
      AND approval_status IN ('DRAFT','PENDING_HR','PENDING_REVIEW')
      AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
);
