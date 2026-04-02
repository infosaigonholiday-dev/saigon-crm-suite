
-- =============================================
-- STEP 1: Add admin_full_access to ALL 60 tables
-- =============================================

CREATE POLICY "admin_full_access" ON public.accommodations FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.accounts_payable FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.accounts_receivable FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.audit_logs FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.benefits_policies FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.booking_itineraries FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.booking_special_notes FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.bookings FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.budget_estimate_items FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.budget_estimates FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.budget_plans FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.budget_settlements FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.business_travel FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.career_paths FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.cashflow_monthly FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.commission_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.commission_rules FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.contracts FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.cost_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.customer_segment_rules FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.customer_tags FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.customers FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.data_assignments FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.department_sops FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.departments FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.documents FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.employee_kpis FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.employee_permissions FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.employee_salaries FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.employees FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.insurance_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.lead_sources FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.leads FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.leave_policies FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.leave_requests FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.marketing_expenses FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.office_expenses FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.other_expenses FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.overtime_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.payments FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.payroll FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.profit_loss_monthly FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.quotations FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.quotes FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.revenue_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.salary_structures FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.sale_targets FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.settlement_items FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.sop_acknowledgements FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.tax_records FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.tour_itineraries FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.tour_packages FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.tour_services FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.transactions FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.user_preferences FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "admin_full_access" ON public.vendors FOR ALL USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- STEP 2: Drop admin-only policies (now redundant)
-- =============================================

DROP POLICY IF EXISTS "app_settings_write" ON public.app_settings;
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;
DROP POLICY IF EXISTS "booking_itineraries_delete" ON public.booking_itineraries;
DROP POLICY IF EXISTS "booking_notes_delete" ON public.booking_special_notes;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
DROP POLICY IF EXISTS "estimates_delete" ON public.budget_estimates;
DROP POLICY IF EXISTS "settlements_delete" ON public.budget_settlements;
DROP POLICY IF EXISTS "contracts_delete" ON public.contracts;
DROP POLICY IF EXISTS "customer_segment_rules_access" ON public.customer_segment_rules;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
DROP POLICY IF EXISTS "sop_delete" ON public.department_sops;
DROP POLICY IF EXISTS "departments_write" ON public.departments;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
DROP POLICY IF EXISTS "documents_write_admin" ON public.documents;
DROP POLICY IF EXISTS "employee_kpis_delete" ON public.employee_kpis;
DROP POLICY IF EXISTS "kpi_delete" ON public.employee_kpis;
DROP POLICY IF EXISTS "permissions_write" ON public.employee_permissions;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
DROP POLICY IF EXISTS "lead_sources_write" ON public.lead_sources;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;
DROP POLICY IF EXISTS "leave_requests_delete" ON public.leave_requests;
DROP POLICY IF EXISTS "marketing_expenses_delete" ON public.marketing_expenses;
DROP POLICY IF EXISTS "office_expenses_delete" ON public.office_expenses;
DROP POLICY IF EXISTS "other_expenses_delete" ON public.other_expenses;
DROP POLICY IF EXISTS "payroll_delete" ON public.payroll;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "sop_ack_delete" ON public.sop_acknowledgements;
DROP POLICY IF EXISTS "tour_services_delete" ON public.tour_services;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;

-- =============================================
-- STEP 3: Recreate policies with ADMIN removed
-- =============================================

-- === accommodations ===
DROP POLICY IF EXISTS "accommodations_write" ON public.accommodations;
CREATE POLICY "accommodations_write" ON public.accommodations FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

-- === accounts_payable ===
DROP POLICY IF EXISTS "accounts_payable_access" ON public.accounts_payable;
CREATE POLICY "accounts_payable_access" ON public.accounts_payable FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === accounts_receivable ===
DROP POLICY IF EXISTS "accounts_receivable_access" ON public.accounts_receivable;
CREATE POLICY "accounts_receivable_access" ON public.accounts_receivable FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === benefits_policies ===
DROP POLICY IF EXISTS "benefits_policies_write" ON public.benefits_policies;
CREATE POLICY "benefits_policies_write" ON public.benefits_policies FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === booking_itineraries ===
DROP POLICY IF EXISTS "booking_itineraries_insert" ON public.booking_itineraries;
CREATE POLICY "booking_itineraries_insert" ON public.booking_itineraries FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','TOUR'])
  );

DROP POLICY IF EXISTS "booking_itineraries_read" ON public.booking_itineraries;
CREATE POLICY "booking_itineraries_read" ON public.booking_itineraries FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','KETOAN','TOUR'])
  );

DROP POLICY IF EXISTS "booking_itineraries_update" ON public.booking_itineraries;
CREATE POLICY "booking_itineraries_update" ON public.booking_itineraries FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','TOUR'])
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_itineraries.booking_id AND b.sale_id = auth.uid()))
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','TOUR'])
  );

-- === booking_special_notes ===
DROP POLICY IF EXISTS "booking_notes_read" ON public.booking_special_notes;
CREATE POLICY "booking_notes_read" ON public.booking_special_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND (
      b.sale_id = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['DIEUHAN','KETOAN','TOUR'])
      OR (b.department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
    ))
  );

DROP POLICY IF EXISTS "booking_notes_write" ON public.booking_special_notes;
CREATE POLICY "booking_notes_write" ON public.booking_special_notes FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD'])
    OR (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_special_notes.booking_id AND b.sale_id = auth.uid()))
  );

-- === bookings ===
DROP POLICY IF EXISTS "bookings_read" ON public.bookings;
CREATE POLICY "bookings_read" ON public.bookings FOR SELECT
  USING (
    sale_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
  );

DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE
  USING (sale_id = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (sale_id = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

DROP POLICY IF EXISTS "bookings_write" ON public.bookings;
CREATE POLICY "bookings_write" ON public.bookings FOR INSERT
  WITH CHECK (sale_id = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === budget_estimate_items ===
DROP POLICY IF EXISTS "estimate_items_all" ON public.budget_estimate_items;
CREATE POLICY "estimate_items_all" ON public.budget_estimate_items FOR ALL
  USING (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']))))
  WITH CHECK (EXISTS (SELECT 1 FROM budget_estimates WHERE budget_estimates.id = budget_estimate_items.estimate_id AND (budget_estimates.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']))));

-- === budget_estimates ===
DROP POLICY IF EXISTS "estimates_read" ON public.budget_estimates;
CREATE POLICY "estimates_read" ON public.budget_estimates FOR SELECT
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']));

DROP POLICY IF EXISTS "estimates_update" ON public.budget_estimates;
CREATE POLICY "estimates_update" ON public.budget_estimates FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "estimates_write" ON public.budget_estimates;
CREATE POLICY "estimates_write" ON public.budget_estimates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'DIEUHAN'));

-- === budget_plans ===
DROP POLICY IF EXISTS "budget_plans_access" ON public.budget_plans;
CREATE POLICY "budget_plans_access" ON public.budget_plans FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === budget_settlements ===
DROP POLICY IF EXISTS "settlements_read" ON public.budget_settlements;
CREATE POLICY "settlements_read" ON public.budget_settlements FOR SELECT
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']));

DROP POLICY IF EXISTS "settlements_update" ON public.budget_settlements;
CREATE POLICY "settlements_update" ON public.budget_settlements FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "settlements_write" ON public.budget_settlements;
CREATE POLICY "settlements_write" ON public.budget_settlements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'DIEUHAN'));

-- === business_travel ===
DROP POLICY IF EXISTS "business_travel_access" ON public.business_travel;
CREATE POLICY "business_travel_access" ON public.business_travel FOR ALL
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === career_paths ===
DROP POLICY IF EXISTS "career_paths_read" ON public.career_paths;
CREATE POLICY "career_paths_read" ON public.career_paths FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

DROP POLICY IF EXISTS "career_paths_write" ON public.career_paths;
CREATE POLICY "career_paths_write" ON public.career_paths FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === cashflow_monthly ===
DROP POLICY IF EXISTS "cashflow_monthly_access" ON public.cashflow_monthly;
CREATE POLICY "cashflow_monthly_access" ON public.cashflow_monthly FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === commission_records ===
DROP POLICY IF EXISTS "commission_records_access" ON public.commission_records;
CREATE POLICY "commission_records_access" ON public.commission_records FOR ALL
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === commission_rules ===
DROP POLICY IF EXISTS "commission_rules_access" ON public.commission_rules;
CREATE POLICY "commission_rules_access" ON public.commission_rules FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === contracts ===
DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'DIEUHAN') OR created_by = auth.uid());

DROP POLICY IF EXISTS "contracts_read" ON public.contracts;
CREATE POLICY "contracts_read" ON public.contracts FOR SELECT
  USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['DIEUHAN','KETOAN']));

DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === cost_records ===
DROP POLICY IF EXISTS "cost_records_access" ON public.cost_records;
CREATE POLICY "cost_records_access" ON public.cost_records FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === customer_tags ===
DROP POLICY IF EXISTS "customer_tags_access" ON public.customer_tags;
CREATE POLICY "customer_tags_access" ON public.customer_tags FOR ALL
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'DIEUHAN')
    OR EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_tags.customer_id AND c.assigned_sale_id = auth.uid())
  )
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === customers ===
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

DROP POLICY IF EXISTS "customers_read" ON public.customers;
CREATE POLICY "customers_read" ON public.customers FOR SELECT
  USING (
    assigned_sale_id = auth.uid()
    OR created_by = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
  );

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  USING (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (assigned_sale_id = auth.uid() OR created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === data_assignments ===
DROP POLICY IF EXISTS "data_assignments_access" ON public.data_assignments;
CREATE POLICY "data_assignments_access" ON public.data_assignments FOR ALL
  USING (has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (has_role(auth.uid(), 'DIEUHAN'));

-- === department_sops ===
DROP POLICY IF EXISTS "sop_read" ON public.department_sops;
CREATE POLICY "sop_read" ON public.department_sops FOR SELECT
  USING (department_id IS NULL OR department_id = get_my_department_id());

DROP POLICY IF EXISTS "sop_update" ON public.department_sops;
CREATE POLICY "sop_update" ON public.department_sops FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "sop_write" ON public.department_sops;
CREATE POLICY "sop_write" ON public.department_sops FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']));

-- === documents ===
DROP POLICY IF EXISTS "documents_read" ON public.documents;
CREATE POLICY "documents_read" ON public.documents FOR SELECT
  USING (uploaded_by = auth.uid() OR is_public = true);

-- === employee_kpis ===
DROP POLICY IF EXISTS "kpi_read" ON public.employee_kpis;
CREATE POLICY "kpi_read" ON public.employee_kpis FOR SELECT
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

DROP POLICY IF EXISTS "kpi_update" ON public.employee_kpis;
CREATE POLICY "kpi_update" ON public.employee_kpis FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']));

DROP POLICY IF EXISTS "kpi_write" ON public.employee_kpis;
CREATE POLICY "kpi_write" ON public.employee_kpis FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']));

-- === employee_permissions ===
DROP POLICY IF EXISTS "permissions_read" ON public.employee_permissions;
CREATE POLICY "permissions_read" ON public.employee_permissions FOR SELECT
  USING (employee_id = get_my_employee_id());

-- === employee_salaries ===
DROP POLICY IF EXISTS "employee_salaries_access" ON public.employee_salaries;
CREATE POLICY "employee_salaries_access" ON public.employee_salaries FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === employees ===
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'HR_MANAGER'));

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT
  USING (
    profile_id = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

-- === insurance_records ===
DROP POLICY IF EXISTS "insurance_records_access" ON public.insurance_records;
CREATE POLICY "insurance_records_access" ON public.insurance_records FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === invoices ===
DROP POLICY IF EXISTS "invoices_access" ON public.invoices;
CREATE POLICY "invoices_access" ON public.invoices FOR ALL
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'));

-- === leads ===
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads FOR INSERT
  WITH CHECK (assigned_to = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

DROP POLICY IF EXISTS "leads_read" ON public.leads;
CREATE POLICY "leads_read" ON public.leads FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR has_any_role(auth.uid(), ARRAY['DIEUHAN','KETOAN'])
    OR (department_id = get_my_department_id() AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD']))
  );

DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads FOR UPDATE
  USING (assigned_to = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (assigned_to = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === leave_policies ===
DROP POLICY IF EXISTS "leave_policies_write" ON public.leave_policies;
CREATE POLICY "leave_policies_write" ON public.leave_policies FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === leave_requests ===
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
CREATE POLICY "leave_requests_insert" ON public.leave_requests FOR INSERT
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
CREATE POLICY "leave_requests_select" ON public.leave_requests FOR SELECT
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
CREATE POLICY "leave_requests_update" ON public.leave_requests FOR UPDATE
  USING (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  )
  WITH CHECK (
    employee_id = get_my_employee_id()
    OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS'])
    OR (employee_id IN (SELECT employees.id FROM employees WHERE employees.department_id = get_my_department_id()) AND has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']))
  );

-- === marketing_expenses ===
DROP POLICY IF EXISTS "marketing_expenses_insert" ON public.marketing_expenses;
CREATE POLICY "marketing_expenses_insert" ON public.marketing_expenses FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','MKT']));

DROP POLICY IF EXISTS "marketing_expenses_read" ON public.marketing_expenses;
CREATE POLICY "marketing_expenses_read" ON public.marketing_expenses FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['KETOAN','MKT']));

DROP POLICY IF EXISTS "marketing_expenses_update" ON public.marketing_expenses;
CREATE POLICY "marketing_expenses_update" ON public.marketing_expenses FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['KETOAN','MKT']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','MKT']));

-- === office_expenses ===
DROP POLICY IF EXISTS "office_expenses_insert" ON public.office_expenses;
CREATE POLICY "office_expenses_insert" ON public.office_expenses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "office_expenses_read" ON public.office_expenses;
CREATE POLICY "office_expenses_read" ON public.office_expenses FOR SELECT
  USING (has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "office_expenses_update" ON public.office_expenses;
CREATE POLICY "office_expenses_update" ON public.office_expenses FOR UPDATE
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === other_expenses ===
DROP POLICY IF EXISTS "other_expenses_insert" ON public.other_expenses;
CREATE POLICY "other_expenses_insert" ON public.other_expenses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "other_expenses_read" ON public.other_expenses;
CREATE POLICY "other_expenses_read" ON public.other_expenses FOR SELECT
  USING (has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "other_expenses_update" ON public.other_expenses;
CREATE POLICY "other_expenses_update" ON public.other_expenses FOR UPDATE
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === overtime_records ===
DROP POLICY IF EXISTS "overtime_records_access" ON public.overtime_records;
CREATE POLICY "overtime_records_access" ON public.overtime_records FOR ALL
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  WITH CHECK (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']));

-- === payments ===
DROP POLICY IF EXISTS "payments_access" ON public.payments;
CREATE POLICY "payments_access" ON public.payments FOR ALL
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'KETOAN'));

-- === payroll ===
DROP POLICY IF EXISTS "payroll_insert" ON public.payroll;
CREATE POLICY "payroll_insert" ON public.payroll FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN']));

DROP POLICY IF EXISTS "payroll_update" ON public.payroll;
CREATE POLICY "payroll_update" ON public.payroll FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS','KETOAN']));

-- === profiles (special) ===
-- admin_full_access already created above
-- Create separate HR policy
CREATE POLICY "hr_manage_profiles" ON public.profiles FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['HR_MANAGER','HCNS']));

-- === profit_loss_monthly ===
DROP POLICY IF EXISTS "profit_loss_monthly_access" ON public.profit_loss_monthly;
CREATE POLICY "profit_loss_monthly_access" ON public.profit_loss_monthly FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === quotations ===
DROP POLICY IF EXISTS "quotations_access" ON public.quotations;
CREATE POLICY "quotations_access" ON public.quotations FOR ALL
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === quotes ===
DROP POLICY IF EXISTS "quotes_access" ON public.quotes;
CREATE POLICY "quotes_access" ON public.quotes FOR ALL
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'));

-- === revenue_records ===
DROP POLICY IF EXISTS "revenue_records_access" ON public.revenue_records;
CREATE POLICY "revenue_records_access" ON public.revenue_records FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === salary_structures ===
DROP POLICY IF EXISTS "salary_structures_access" ON public.salary_structures;
CREATE POLICY "salary_structures_access" ON public.salary_structures FOR ALL
  USING (has_role(auth.uid(), 'HCNS'))
  WITH CHECK (has_role(auth.uid(), 'HCNS'));

-- === sale_targets ===
DROP POLICY IF EXISTS "sale_targets_own" ON public.sale_targets;
CREATE POLICY "sale_targets_own" ON public.sale_targets FOR ALL
  USING (sale_id = auth.uid() OR has_role(auth.uid(), 'DIEUHAN'))
  WITH CHECK (has_role(auth.uid(), 'DIEUHAN'));

-- === settlement_items ===
DROP POLICY IF EXISTS "settlement_items_all" ON public.settlement_items;
CREATE POLICY "settlement_items_all" ON public.settlement_items FOR ALL
  USING (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']))))
  WITH CHECK (EXISTS (SELECT 1 FROM budget_settlements WHERE budget_settlements.id = settlement_items.settlement_id AND (budget_settlements.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['KETOAN','DIEUHAN']))));

-- === sop_acknowledgements ===
DROP POLICY IF EXISTS "sop_ack_select" ON public.sop_acknowledgements;
CREATE POLICY "sop_ack_select" ON public.sop_acknowledgements FOR SELECT
  USING (employee_id = get_my_employee_id() OR has_any_role(auth.uid(), ARRAY['MANAGER','GDKD','DIEUHAN']));

-- === tax_records (also clean up DIRECTOR) ===
DROP POLICY IF EXISTS "tax_records_access" ON public.tax_records;
CREATE POLICY "tax_records_access" ON public.tax_records FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

-- === tour_itineraries ===
DROP POLICY IF EXISTS "tour_itineraries_write" ON public.tour_itineraries;
CREATE POLICY "tour_itineraries_write" ON public.tour_itineraries FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

-- === tour_packages ===
DROP POLICY IF EXISTS "tour_packages_write" ON public.tour_packages;
CREATE POLICY "tour_packages_write" ON public.tour_packages FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

-- === tour_services ===
DROP POLICY IF EXISTS "tour_services_insert" ON public.tour_services;
CREATE POLICY "tour_services_insert" ON public.tour_services FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

DROP POLICY IF EXISTS "tour_services_read" ON public.tour_services;
CREATE POLICY "tour_services_read" ON public.tour_services FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','KETOAN']));

DROP POLICY IF EXISTS "tour_services_update" ON public.tour_services;
CREATE POLICY "tour_services_update" ON public.tour_services FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

-- === transactions ===
DROP POLICY IF EXISTS "transactions_admin" ON public.transactions;
CREATE POLICY "transactions_ketoan" ON public.transactions FOR ALL
  USING (has_role(auth.uid(), 'KETOAN'))
  WITH CHECK (has_role(auth.uid(), 'KETOAN'));

DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'KETOAN')
    OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT','PENDING_REVIEW']) AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  );

DROP POLICY IF EXISTS "transactions_read" ON public.transactions;
CREATE POLICY "transactions_read" ON public.transactions FOR SELECT
  USING (
    has_role(auth.uid(), 'KETOAN')
    OR (submitted_by = auth.uid() AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  );

DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE
  USING (
    has_role(auth.uid(), 'KETOAN')
    OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT','REJECTED']) AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  )
  WITH CHECK (
    has_role(auth.uid(), 'KETOAN')
    OR (submitted_by = auth.uid() AND approval_status = ANY(ARRAY['DRAFT','PENDING_REVIEW']) AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
  );

-- === vendors ===
DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
CREATE POLICY "vendors_insert" ON public.vendors FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));

DROP POLICY IF EXISTS "vendors_read" ON public.vendors;
CREATE POLICY "vendors_read" ON public.vendors FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD','KETOAN']));

DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
CREATE POLICY "vendors_update" ON public.vendors FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['DIEUHAN','MANAGER','GDKD']));
