
-- ============================================================
-- SECURITY FIX: Helper functions, profiles policy, enable RLS + policies for all tables
-- ============================================================

-- 1. Helper functions (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND role = ANY(_roles)) $$;

CREATE OR REPLACE FUNCTION public.get_my_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT e.id FROM employees e WHERE e.profile_id = auth.uid() LIMIT 1 $$;

-- ============================================================
-- 2. CRITICAL: Fix profiles_self privilege escalation
-- ============================================================
DROP POLICY IF EXISTS "profiles_self" ON profiles;
DROP POLICY IF EXISTS "profiles_admin" ON profiles;

CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()));

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- ============================================================
-- 3. Enable RLS + policies for all unprotected tables
-- ============================================================

-- DEPARTMENTS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_write" ON departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- ACCOUNTS_PAYABLE
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_payable_access" ON accounts_payable FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- ACCOUNTS_RECEIVABLE
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_receivable_access" ON accounts_receivable FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_access" ON invoices FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_access" ON payments FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- BUDGET_PLANS
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_plans_access" ON budget_plans FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- CASHFLOW_MONTHLY
ALTER TABLE cashflow_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashflow_monthly_access" ON cashflow_monthly FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- PROFIT_LOSS_MONTHLY
ALTER TABLE profit_loss_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profit_loss_monthly_access" ON profit_loss_monthly FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- REVENUE_RECORDS
ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revenue_records_access" ON revenue_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- COST_RECORDS
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_records_access" ON cost_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- TAX_RECORDS
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_records_access" ON tax_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- COMMISSION_RULES
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rules_access" ON commission_rules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- COMMISSION_RECORDS
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_records_access" ON commission_records FOR ALL TO authenticated
  USING (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- EMPLOYEE_SALARIES
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_salaries_access" ON employee_salaries FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- INSURANCE_RECORDS
ALTER TABLE insurance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_records_access" ON insurance_records FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- SALARY_STRUCTURES
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary_structures_access" ON salary_structures FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- LEAVE_POLICIES
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_policies_read" ON leave_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_policies_write" ON leave_policies FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']));

-- LEAVE_REQUESTS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_requests_access" ON leave_requests FOR ALL TO authenticated
  USING (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- OVERTIME_RECORDS
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overtime_records_access" ON overtime_records FOR ALL TO authenticated
  USING (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- OFFICE_EXPENSES
ALTER TABLE office_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office_expenses_access" ON office_expenses FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','KETOAN','DIRECTOR']));

-- BUSINESS_TRAVEL
ALTER TABLE business_travel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_travel_access" ON business_travel FOR ALL TO authenticated
  USING (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']))
  WITH CHECK (employee_id = public.get_my_employee_id() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS','DIRECTOR']));

-- BENEFITS_POLICIES
ALTER TABLE benefits_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benefits_policies_read" ON benefits_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "benefits_policies_write" ON benefits_policies FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']));

-- CAREER_PATHS
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_paths_read" ON career_paths FOR SELECT TO authenticated USING (true);
CREATE POLICY "career_paths_write" ON career_paths FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','HCNS']));

-- QUOTES
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_access" ON quotes FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR','DIEUHAN']))
  WITH CHECK (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR','DIEUHAN']));

-- CONTRACTS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_access" ON contracts FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR']))
  WITH CHECK (created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR']));

-- LEAD_SOURCES
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_sources_read" ON lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_sources_write" ON lead_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- CUSTOMER_TAGS
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_tags_access" ON customer_tags FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR'])
    OR EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_tags.customer_id AND c.assigned_sale_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR'])
  );

-- CUSTOMER_SEGMENT_RULES
ALTER TABLE customer_segment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_segment_rules_access" ON customer_segment_rules FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','DIRECTOR']));

-- DATA_ASSIGNMENTS
ALTER TABLE data_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_assignments_access" ON data_assignments FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','DIRECTOR']));

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_access" ON documents FOR ALL TO authenticated
  USING (uploaded_by = auth.uid() OR is_public = true OR public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));

-- APP_SETTINGS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_read" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_write" ON app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- USER_PREFERENCES
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_own" ON user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
