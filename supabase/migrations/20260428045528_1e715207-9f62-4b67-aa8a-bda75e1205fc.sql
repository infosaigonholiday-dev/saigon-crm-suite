CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_table TEXT NOT NULL DEFAULT 'office_expenses' CHECK (expense_table IN ('office_expenses','marketing_expenses','other_expenses')),
  recurrence TEXT NOT NULL DEFAULT 'monthly' CHECK (recurrence IN ('monthly','quarterly','yearly')),
  day_of_month INT DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  is_active BOOLEAN DEFAULT true,
  last_generated_month TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_expenses_read" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_read" ON public.recurring_expenses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "recurring_expenses_manage" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_manage" ON public.recurring_expenses
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS']));

DROP TRIGGER IF EXISTS touch_recurring_expenses ON public.recurring_expenses;
CREATE TRIGGER touch_recurring_expenses
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON public.recurring_expenses(is_active, expense_table);