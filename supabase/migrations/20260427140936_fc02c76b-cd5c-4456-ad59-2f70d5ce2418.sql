-- ============================================================
-- HCNS Phần 1/3: ALTER payroll + 3 bảng mới + RLS + permissions DB
-- ============================================================

-- 1. ALTER payroll: thêm cột KPI + 4-bước duyệt (paid_at đã tồn tại)
ALTER TABLE public.payroll
  ADD COLUMN IF NOT EXISTS base_fixed numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_kpi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_kpi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_performance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_achievement_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_earned numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_working_days numeric DEFAULT 26,
  ADD COLUMN IF NOT EXISTS actual_working_days numeric DEFAULT 26,
  ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kt_confirmed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS kt_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ceo_approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS ceo_approved_at timestamptz;

ALTER TABLE public.payroll DROP CONSTRAINT IF EXISTS payroll_status_check;
ALTER TABLE public.payroll ADD CONSTRAINT payroll_status_check
  CHECK (status IN ('draft','hr_reviewed','kt_confirmed','ceo_approved','paid'));

-- 2. kpi_policies
CREATE TABLE IF NOT EXISTS public.kpi_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  calculation_type text NOT NULL CHECK (calculation_type IN ('profit_based','task_based','fixed')),
  base_fixed_ratio numeric DEFAULT 0.8,
  base_kpi_ratio numeric DEFAULT 0.2,
  target_multiplier numeric DEFAULT 2.5,
  kpi_penalty_rate numeric DEFAULT 0.2,
  bonus_tiers jsonb DEFAULT '[
    {"min_ratio":1.0,"max_ratio":1.5,"rate":0.20},
    {"min_ratio":1.5,"max_ratio":2.0,"rate":0.25},
    {"min_ratio":2.0,"max_ratio":3.0,"rate":0.30},
    {"min_ratio":3.0,"max_ratio":999,"rate":0.40}
  ]'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  position_applied text,
  department_id uuid REFERENCES public.departments(id),
  cv_url text,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new','cv_screening','interview','offer','onboarded','rejected','withdrawn')),
  rejection_reason text,
  interview_date timestamptz,
  interview_result text,
  salary_expectation numeric,
  offer_salary numeric,
  note text,
  assigned_hr uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. onboarding_checklist
CREATE TABLE IF NOT EXISTS public.onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, item_name)
);

-- 5. RLS
-- payroll: drop policies cũ + tạo lại 2 policy chuẩn
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access" ON public.payroll;
DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
DROP POLICY IF EXISTS "payroll_insert" ON public.payroll;
DROP POLICY IF EXISTS "payroll_update" ON public.payroll;
DROP POLICY IF EXISTS "payroll_self" ON public.payroll;
DROP POLICY IF EXISTS "payroll_read" ON public.payroll;
DROP POLICY IF EXISTS "payroll_write" ON public.payroll;

CREATE POLICY "payroll_read" ON public.payroll FOR SELECT TO authenticated
USING (
  employee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN','GDKD'])
);
CREATE POLICY "payroll_write" ON public.payroll FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

-- candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidates_hr" ON public.candidates;
DROP POLICY IF EXISTS "candidates_dept_read" ON public.candidates;

CREATE POLICY "candidates_hr" ON public.candidates FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

CREATE POLICY "candidates_dept_read" ON public.candidates FOR SELECT TO authenticated
USING (
  department_id = public.get_my_department_id()
  AND public.has_any_role(auth.uid(), ARRAY['GDKD','MANAGER','DIEUHAN'])
);

-- kpi_policies
ALTER TABLE public.kpi_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kpi_read" ON public.kpi_policies;
DROP POLICY IF EXISTS "kpi_write" ON public.kpi_policies;

CREATE POLICY "kpi_read" ON public.kpi_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_write" ON public.kpi_policies FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER']));

-- onboarding_checklist
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_self" ON public.onboarding_checklist;

CREATE POLICY "onboarding_self" ON public.onboarding_checklist FOR ALL TO authenticated
USING (
  employee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
)
WITH CHECK (
  employee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
);
