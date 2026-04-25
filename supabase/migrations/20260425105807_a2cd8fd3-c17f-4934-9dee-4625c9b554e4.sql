
-- 1. expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.expense_categories (name, sort_order) VALUES
  ('Văn phòng phẩm',1),('Điện nước',2),('Thuê văn phòng',3),
  ('Marketing / Quảng cáo',4),('Tiếp khách',5),('Lương',6),
  ('BHXH / BHYT / BHTN',7),('Phí dịch vụ',8),('Vận chuyển',9),('Khác',99)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_read ON public.expense_categories;
CREATE POLICY expense_categories_read ON public.expense_categories
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS','HR_MANAGER','INTERN_KETOAN','INTERN_HCNS'])
  );

DROP POLICY IF EXISTS expense_categories_write ON public.expense_categories;
CREATE POLICY expense_categories_write ON public.expense_categories
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 2. Cột bổ sung
ALTER TABLE public.budget_estimates
  ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_recipient text,
  ADD COLUMN IF NOT EXISTS advance_purpose text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.budget_settlements
  ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS topup_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS expense_category_id uuid REFERENCES public.expense_categories(id),
  ADD COLUMN IF NOT EXISTS evidence_url text;

-- 3. Trigger ép default cho HCNS/HR_MANAGER
CREATE OR REPLACE FUNCTION public.enforce_hcns_transaction_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER'])
     AND NOT has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']) THEN
    NEW.submitted_by := auth.uid();
    IF NEW.approval_status IS NULL OR NEW.approval_status NOT IN ('DRAFT','PENDING_HR') THEN
      NEW.approval_status := 'PENDING_HR';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_hcns_transaction_defaults ON public.transactions;
CREATE TRIGGER trg_enforce_hcns_transaction_defaults
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hcns_transaction_defaults();

-- 4. RLS profit_loss_monthly + cost_records
DROP POLICY IF EXISTS admin_full_access ON public.profit_loss_monthly;
DROP POLICY IF EXISTS profit_loss_monthly_access ON public.profit_loss_monthly;
DROP POLICY IF EXISTS pnl_finance_only ON public.profit_loss_monthly;
CREATE POLICY pnl_finance_only ON public.profit_loss_monthly
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));

DROP POLICY IF EXISTS admin_full_access ON public.cost_records;
DROP POLICY IF EXISTS cost_records_access ON public.cost_records;
DROP POLICY IF EXISTS cost_finance_only ON public.cost_records;
CREATE POLICY cost_finance_only ON public.cost_records
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));

-- 5. RLS revenue_records
DROP POLICY IF EXISTS admin_full_access ON public.revenue_records;
DROP POLICY IF EXISTS revenue_records_access ON public.revenue_records;
DROP POLICY IF EXISTS revenue_admin_kt ON public.revenue_records;
DROP POLICY IF EXISTS revenue_dept_managers ON public.revenue_records;
DROP POLICY IF EXISTS revenue_sale_own ON public.revenue_records;

CREATE POLICY revenue_admin_kt ON public.revenue_records
  FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN']));

CREATE POLICY revenue_dept_managers ON public.revenue_records
  FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['GDKD','MANAGER'])
    AND department_id = get_my_department_id()
  );

-- 6. Helper + bookings update lock
CREATE OR REPLACE FUNCTION public.is_booking_closed(_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM bookings WHERE id = _booking_id AND status = 'closed');
$$;

DROP POLICY IF EXISTS bookings_update ON public.bookings;
CREATE POLICY bookings_update ON public.bookings
  FOR UPDATE
  USING (
    (
      (sale_id = auth.uid()) OR has_role(auth.uid(), 'DIEUHAN') OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
    )
    AND (
      COALESCE(status,'') != 'closed'
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
    )
  )
  WITH CHECK (
    (sale_id = auth.uid()) OR has_role(auth.uid(), 'DIEUHAN') OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
  );

DROP POLICY IF EXISTS estimates_update ON public.budget_estimates;
CREATE POLICY estimates_update ON public.budget_estimates
  FOR UPDATE
  USING (
    (
      (created_by = auth.uid()) OR has_any_role(auth.uid(), ARRAY['KETOAN','ADMIN','SUPER_ADMIN'])
    )
    AND (
      booking_id IS NULL
      OR NOT is_booking_closed(booking_id)
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
    )
  );

DROP POLICY IF EXISTS settlements_update ON public.budget_settlements;
CREATE POLICY settlements_update ON public.budget_settlements
  FOR UPDATE
  USING (
    (
      (created_by = auth.uid()) OR has_any_role(auth.uid(), ARRAY['KETOAN','ADMIN','SUPER_ADMIN'])
    )
    AND (
      booking_id IS NULL
      OR NOT is_booking_closed(booking_id)
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
    )
  );

DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions
  FOR UPDATE
  USING (
    (
      has_any_role(auth.uid(), ARRAY['KETOAN','ADMIN','SUPER_ADMIN'])
      OR (
        submitted_by = auth.uid()
        AND approval_status = ANY (ARRAY['DRAFT','REJECTED','PENDING_HR'])
        AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER'])
      )
    )
    AND (
      booking_id IS NULL
      OR NOT is_booking_closed(booking_id)
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
    )
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['KETOAN','ADMIN','SUPER_ADMIN'])
    OR (
      submitted_by = auth.uid()
      AND approval_status = ANY (ARRAY['DRAFT','PENDING_HR','PENDING_REVIEW'])
      AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER'])
    )
  );

-- 7. Audit triggers
CREATE OR REPLACE FUNCTION public.log_finance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_user_name text;
  v_action text;
  v_summary text;
  v_changed text[] := ARRAY[]::text[];
  v_old jsonb;
  v_new jsonb;
  v_key text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT role, full_name INTO v_user_role, v_user_name FROM profiles WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_summary := format('Tạo %s mới', TG_TABLE_NAME);
    INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, change_summary)
    VALUES (v_user_id, v_user_role, v_user_name, TG_TABLE_NAME, NEW.id, v_action, NULL, to_jsonb(NEW), v_summary);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
    IF array_length(v_changed,1) IS NULL THEN RETURN NEW; END IF;
    IF 'status' = ANY(v_changed) OR 'approval_status' = ANY(v_changed) THEN
      v_action := 'STATUS_CHANGE';
      v_summary := format('Đổi trạng thái %s', TG_TABLE_NAME);
    ELSE
      v_action := 'UPDATE';
      v_summary := format('Cập nhật %s', TG_TABLE_NAME);
    END IF;
    INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, changed_fields, change_summary)
    VALUES (v_user_id, v_user_role, v_user_name, TG_TABLE_NAME, NEW.id, v_action, v_old, v_new, v_changed, v_summary);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, change_summary)
    VALUES (v_user_id, v_user_role, v_user_name, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL, format('Xóa %s', TG_TABLE_NAME));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_budget_estimates ON public.budget_estimates;
CREATE TRIGGER trg_audit_budget_estimates
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_estimates
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes();

DROP TRIGGER IF EXISTS trg_audit_budget_settlements ON public.budget_settlements;
CREATE TRIGGER trg_audit_budget_settlements
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_settlements
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes();

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes();

-- 8. Storage bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('finance-evidence','finance-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS finance_evidence_owner_rw ON storage.objects;
CREATE POLICY finance_evidence_owner_rw ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'finance-evidence' AND (
      owner = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN'])
    )
  )
  WITH CHECK (
    bucket_id = 'finance-evidence' AND (
      owner = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN'])
    )
  );
