-- Tạo helper function cho updated_at trong public schema
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- BƯỚC 1: 4 BẢNG
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  owner_id UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  start_date DATE,
  end_date DATE,
  target_value NUMERIC DEFAULT 0,
  target_unit TEXT,
  actual_value NUMERIC DEFAULT 0,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','blocked')),
  completion_pct INT DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  deliverables TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.employees(id),
  reporter_id UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','blocked','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  tags TEXT[],
  entity_type TEXT,
  entity_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('status_change','comment','time_log','attachment')),
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  hours_logged NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BƯỚC 2: INDEXES
CREATE INDEX IF NOT EXISTS idx_campaigns_dept ON public.campaigns(department_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_milestones_campaign ON public.milestones(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON public.tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_logs_task ON public.task_logs(task_id);

-- BƯỚC 3: RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_read" ON public.campaigns FOR SELECT TO authenticated
USING (
  department_id = public.get_my_department_id()
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','HR_MANAGER'])
  OR owner_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
);
CREATE POLICY "campaigns_write" ON public.campaigns FOR ALL TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS'])
  OR owner_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS'])
  OR owner_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
);

CREATE POLICY "milestones_read" ON public.milestones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id
  AND (c.department_id = public.get_my_department_id()
    OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','HR_MANAGER'])
    OR c.owner_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1))
));
CREATE POLICY "milestones_write" ON public.milestones FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS']));

CREATE POLICY "tasks_read" ON public.tasks FOR SELECT TO authenticated
USING (
  assignee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
  OR reporter_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id
    AND (c.department_id = public.get_my_department_id()
      OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','HR_MANAGER'])))
);
CREATE POLICY "tasks_write" ON public.tasks FOR ALL TO authenticated
USING (
  assignee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS'])
)
WITH CHECK (
  assignee_id = (SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1)
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS'])
);

CREATE POLICY "task_logs_read" ON public.task_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_logs_write" ON public.task_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Triggers
CREATE TRIGGER tg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();