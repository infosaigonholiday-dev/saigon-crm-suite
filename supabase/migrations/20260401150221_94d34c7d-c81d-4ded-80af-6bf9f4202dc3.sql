
CREATE TABLE IF NOT EXISTS department_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id),
  level text CHECK (level IN ('C-LEVEL','DIRECTOR','MANAGER','STAFF','INTERN')),
  title text NOT NULL,
  description text,
  content text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general','onboarding','daily','weekly','monthly','process','checklist')),
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid REFERENCES department_sops(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  UNIQUE(sop_id, employee_id)
);

ALTER TABLE department_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_acknowledgements ENABLE ROW LEVEL SECURITY;

-- SOP read: own department + company-wide + admin sees all
CREATE POLICY "sop_read" ON department_sops FOR SELECT TO authenticated
USING (
  department_id IS NULL
  OR department_id = get_my_department_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD'])
);

-- SOP create/update: manager+ roles
CREATE POLICY "sop_write" ON department_sops FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','DIEUHAN']));

CREATE POLICY "sop_update" ON department_sops FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD'])
)
WITH CHECK (
  created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD'])
);

CREATE POLICY "sop_delete" ON department_sops FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- Acknowledgements: own or admin/HR
CREATE POLICY "sop_ack_select" ON sop_acknowledgements FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','DIEUHAN'])
);

CREATE POLICY "sop_ack_insert" ON sop_acknowledgements FOR INSERT TO authenticated
WITH CHECK (employee_id = get_my_employee_id());

CREATE POLICY "sop_ack_delete" ON sop_acknowledgements FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
