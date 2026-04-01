
CREATE TABLE IF NOT EXISTS employee_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) NOT NULL,
  department_id uuid REFERENCES departments(id),
  period_type text NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly')),
  period_year integer NOT NULL,
  period_value integer NOT NULL,
  kpi_name text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  actual_value numeric DEFAULT 0,
  unit text DEFAULT 'number' CHECK (unit IN ('number','currency','percent')),
  achievement_pct numeric GENERATED ALWAYS AS (
    CASE WHEN target_value > 0 THEN ROUND((actual_value / target_value) * 100, 1) ELSE 0 END
  ) STORED,
  note text,
  evaluated_by uuid REFERENCES profiles(id),
  evaluated_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_read" ON employee_kpis FOR SELECT TO authenticated
USING (
  employee_id = get_my_employee_id()
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','HR_MANAGER','KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','DIEUHAN']))
);

CREATE POLICY "kpi_write" ON employee_kpis FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','DIEUHAN']));

CREATE POLICY "kpi_update" ON employee_kpis FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD','MANAGER','DIEUHAN']));

CREATE POLICY "kpi_delete" ON employee_kpis FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','HR_HEAD']));

CREATE INDEX idx_kpis_employee ON employee_kpis(employee_id);
CREATE INDEX idx_kpis_period ON employee_kpis(period_year, period_value, period_type);
CREATE INDEX idx_kpis_department ON employee_kpis(department_id);
