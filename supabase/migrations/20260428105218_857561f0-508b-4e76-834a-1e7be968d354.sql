-- ============================================================
-- BUG #5 (NEW): Fix sync_accounts_receivable status values
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_accounts_receivable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric;
  v_paid numeric;
  v_due date;
  v_days_overdue int;
  v_status text;
BEGIN
  DELETE FROM accounts_receivable WHERE booking_id = NEW.id;
  v_remaining := COALESCE(NEW.remaining_amount, COALESCE(NEW.total_value,0) - COALESCE(NEW.deposit_amount,0), 0);
  v_paid := COALESCE(NEW.total_value,0) - v_remaining;
  v_due := COALESCE(NEW.remaining_due_at, NEW.deposit_due_at, (now() + interval '30 days')::date);

  IF v_remaining > 0 AND COALESCE(NEW.status,'') NOT IN ('cancelled','CANCELLED') THEN
    v_days_overdue := GREATEST(0, (CURRENT_DATE - v_due));
    v_status := CASE
      WHEN v_days_overdue = 0 THEN 'CURRENT'
      WHEN v_days_overdue <= 30 THEN 'OVERDUE_30'
      WHEN v_days_overdue <= 60 THEN 'OVERDUE_60'
      WHEN v_days_overdue <= 90 THEN 'OVERDUE_90'
      ELSE 'BAD_DEBT'
    END;

    INSERT INTO accounts_receivable (
      customer_id, booking_id, amount_due, amount_paid, amount_remaining,
      due_date, status, created_at
    ) VALUES (
      NEW.customer_id, NEW.id, COALESCE(NEW.total_value, 0), v_paid, v_remaining, v_due,
      v_status, now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- BUG #1: Fix rpc_dashboard_ceo (nested aggregate error)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_dashboard_ceo(p_dept_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_start_month timestamptz := date_trunc('month', now());
  v_start_year timestamptz := date_trunc('year', now());
  v_end_year timestamptz := date_trunc('year', now()) + interval '1 year';
  v_customer_overview jsonb;
  v_pipeline jsonb;
  v_sale_perf jsonb;
  v_revenue_chart jsonb;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('ADMIN','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','KETOAN') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'new_this_month', COUNT(*) FILTER (WHERE created_at >= v_start_month),
    'tier_diamond', COUNT(*) FILTER (WHERE tier = 'Diamond'),
    'tier_gold', COUNT(*) FILTER (WHERE tier = 'Gold'),
    'tier_silver', COUNT(*) FILTER (WHERE tier = 'Silver'),
    'tier_new', COUNT(*) FILTER (WHERE tier = 'Mới' OR tier IS NULL),
    'blacklisted', COUNT(*) FILTER (WHERE is_blacklisted = true)
  ) INTO v_customer_overview
  FROM customers
  WHERE p_dept_id IS NULL OR department_id = p_dept_id;

  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO v_pipeline
  FROM (
    SELECT COALESCE(status,'NEW') AS status, COUNT(*) AS cnt
    FROM leads
    WHERE p_dept_id IS NULL OR department_id = p_dept_id
    GROUP BY status
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC), '[]'::jsonb)
  INTO v_sale_perf
  FROM (
    SELECT
      p.id AS sale_id,
      p.full_name,
      COALESCE(SUM(b.total_value),0) AS revenue,
      COUNT(b.id) AS bookings
    FROM profiles p
    LEFT JOIN bookings b ON b.sale_id = p.id AND b.created_at >= v_start_month
      AND (p_dept_id IS NULL OR b.department_id = p_dept_id)
    WHERE p.is_active = true
      AND p.role IN ('SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE')
      AND (p_dept_id IS NULL OR p.department_id = p_dept_id)
    GROUP BY p.id, p.full_name
    ORDER BY revenue DESC
    LIMIT 10
  ) t;

  WITH months AS (SELECT generate_series(1,12) AS m),
       agg AS (
         SELECT EXTRACT(MONTH FROM created_at)::int AS m, SUM(total_value) AS rev
         FROM bookings
         WHERE created_at >= v_start_year AND created_at < v_end_year
           AND (p_dept_id IS NULL OR department_id = p_dept_id)
         GROUP BY 1
       )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'month', 'T' || months.m,
           'revenue', ROUND(COALESCE(agg.rev, 0) / 1000000.0)
         ) ORDER BY months.m), '[]'::jsonb)
  INTO v_revenue_chart
  FROM months LEFT JOIN agg ON agg.m = months.m;

  RETURN jsonb_build_object(
    'customer_overview', v_customer_overview,
    'pipeline_funnel', v_pipeline,
    'sale_performance', v_sale_perf,
    'revenue_chart', v_revenue_chart
  );
END;
$$;

-- ============================================================
-- BUG #2: Auto-set booking remaining_amount
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_booking_remaining_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _paid numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO _paid
  FROM payments
  WHERE booking_id = NEW.id AND payment_type != 'Đặt cọc';

  NEW.remaining_amount := COALESCE(NEW.total_value, 0)
                        - COALESCE(NEW.deposit_amount, 0)
                        - COALESCE(_paid, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_remaining ON public.bookings;
CREATE TRIGGER trg_set_booking_remaining
BEFORE INSERT OR UPDATE OF total_value, deposit_amount ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_remaining_on_change();

-- Backfill existing bookings (now safe with fixed AR trigger)
UPDATE public.bookings b SET remaining_amount =
  COALESCE(b.total_value, 0)
  - COALESCE(b.deposit_amount, 0)
  - COALESCE((
      SELECT SUM(amount) FROM public.payments
      WHERE booking_id = b.id AND payment_type != 'Đặt cọc'
    ), 0);

-- ============================================================
-- BUG #3: Mở rộng RLS expense tables
-- ============================================================
DROP POLICY IF EXISTS office_expenses_insert ON public.office_expenses;
DROP POLICY IF EXISTS office_expenses_read   ON public.office_expenses;
DROP POLICY IF EXISTS office_expenses_update ON public.office_expenses;
CREATE POLICY office_expenses_insert ON public.office_expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));
CREATE POLICY office_expenses_read ON public.office_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN']));
CREATE POLICY office_expenses_update ON public.office_expenses
  FOR UPDATE TO authenticated
  USING      (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));

DROP POLICY IF EXISTS marketing_expenses_insert ON public.marketing_expenses;
DROP POLICY IF EXISTS marketing_expenses_read   ON public.marketing_expenses;
DROP POLICY IF EXISTS marketing_expenses_update ON public.marketing_expenses;
CREATE POLICY marketing_expenses_insert ON public.marketing_expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','MKT']));
CREATE POLICY marketing_expenses_read ON public.marketing_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN','MKT']));
CREATE POLICY marketing_expenses_update ON public.marketing_expenses
  FOR UPDATE TO authenticated
  USING      (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','MKT']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','MKT']));

DROP POLICY IF EXISTS other_expenses_insert ON public.other_expenses;
DROP POLICY IF EXISTS other_expenses_read   ON public.other_expenses;
DROP POLICY IF EXISTS other_expenses_update ON public.other_expenses;
CREATE POLICY other_expenses_insert ON public.other_expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));
CREATE POLICY other_expenses_read ON public.other_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN','GDKD','MANAGER','DIEUHAN']));
CREATE POLICY other_expenses_update ON public.other_expenses
  FOR UPDATE TO authenticated
  USING      (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['KETOAN','HCNS','HR_MANAGER','SUPER_ADMIN']));

-- ============================================================
-- BUG #4: Siết RLS recurring_expenses_read
-- ============================================================
DROP POLICY IF EXISTS recurring_expenses_read ON public.recurring_expenses;
CREATE POLICY recurring_expenses_read ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','HCNS','HR_MANAGER','GDKD','MANAGER','DIEUHAN']));