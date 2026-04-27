-- 1. Add avatar_url to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create work_schedules table
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '17:30',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_work_schedules_employee ON public.work_schedules(employee_id);

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_schedules_read_authenticated" ON public.work_schedules;
CREATE POLICY "work_schedules_read_authenticated"
  ON public.work_schedules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "work_schedules_hr_manage" ON public.work_schedules;
CREATE POLICY "work_schedules_hr_manage"
  ON public.work_schedules FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

-- Inline updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_work_schedules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_schedules_updated_at ON public.work_schedules;
CREATE TRIGGER trg_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_work_schedules_updated_at();

-- 3. Storage bucket for employee avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-avatars', 'employee-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "employee_avatars_public_read" ON storage.objects;
CREATE POLICY "employee_avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employee-avatars');

DROP POLICY IF EXISTS "employee_avatars_authenticated_insert" ON storage.objects;
CREATE POLICY "employee_avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employee-avatars');

DROP POLICY IF EXISTS "employee_avatars_authenticated_update" ON storage.objects;
CREATE POLICY "employee_avatars_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'employee-avatars')
  WITH CHECK (bucket_id = 'employee-avatars');

DROP POLICY IF EXISTS "employee_avatars_authenticated_delete" ON storage.objects;
CREATE POLICY "employee_avatars_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'employee-avatars');