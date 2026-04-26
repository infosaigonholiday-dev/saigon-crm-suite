
-- ═══════════════════════════════════════════════════════════
-- 1. INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_raw_contacts_created_by ON public.raw_contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_raw_contacts_department ON public.raw_contacts(department_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_sale_id_created ON public.bookings(sale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_dept_created ON public.bookings(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_dept_status ON public.leads(department_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status ON public.leads(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sale ON public.customers(assigned_sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_dept ON public.customers(department_id);

-- ═══════════════════════════════════════════════════════════
-- 2. KT_ASSIGNED COLUMN
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.budget_estimates ADD COLUMN IF NOT EXISTS kt_assigned_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.budget_settlements ADD COLUMN IF NOT EXISTS kt_assigned_id uuid REFERENCES public.profiles(id);

-- ═══════════════════════════════════════════════════════════
-- 3. NOTIFICATION TRIGGERS — FIX SPAM
-- ═══════════════════════════════════════════════════════════

-- 3a. Budget Estimate: chỉ gửi KT phụ trách hoặc 1 KT đầu tiên
CREATE OR REPLACE FUNCTION public.notify_budget_estimate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
  v_code text;
  v_kt_id uuid;
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  IF (TG_OP='INSERT' AND COALESCE(NEW.status,'') = 'pending_review')
     OR (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending_review') THEN
    v_title := '📋 Dự toán mới cần duyệt';
    v_message := format('Dự toán %s cần Kế toán duyệt', v_code);

    -- Ưu tiên KT đã gán; nếu chưa có → 1 KT active đầu tiên
    v_kt_id := NEW.kt_assigned_id;
    IF v_kt_id IS NULL THEN
      SELECT id INTO v_kt_id FROM profiles
      WHERE is_active = true AND role = 'KETOAN'
      ORDER BY created_at NULLS LAST, id LIMIT 1;
    END IF;

    IF v_kt_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_kt_id, 'BUDGET_ESTIMATE_NEW', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    END IF;

    -- ADMIN/SUPER_ADMIN luôn nhận (1 admin đầu tiên — tránh spam)
    SELECT id INTO v_recipient FROM profiles
    WHERE is_active = true AND role IN ('ADMIN','SUPER_ADMIN')
    ORDER BY role DESC, created_at NULLS LAST LIMIT 1;
    IF v_recipient IS NOT NULL AND v_recipient IS DISTINCT FROM v_kt_id THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'BUDGET_ESTIMATE_NEW', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    END IF;

  ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('approved','rejected') AND NEW.created_by IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      v_title := '✅ Dự toán đã được duyệt';
      v_message := format('Dự toán %s đã được Kế toán duyệt', v_code);
    ELSE
      v_title := '❌ Dự toán bị từ chối';
      v_message := format('Dự toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note,'(không ghi lý do)'));
    END IF;
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (NEW.created_by, 'BUDGET_ESTIMATE_RESULT', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
  END IF;

  RETURN NEW;
END;
$$;

-- 3b. Budget Settlement: chỉ gửi KT phụ trách hoặc 1 KT đầu tiên
CREATE OR REPLACE FUNCTION public.notify_budget_settlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
  v_code text;
  v_kt_id uuid;
  v_admin_id uuid;
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Lấy KT phụ trách (fallback 1 KT đầu tiên)
    v_kt_id := NEW.kt_assigned_id;
    IF v_kt_id IS NULL THEN
      SELECT id INTO v_kt_id FROM profiles
      WHERE is_active = true AND role = 'KETOAN'
      ORDER BY created_at NULLS LAST, id LIMIT 1;
    END IF;

    SELECT id INTO v_admin_id FROM profiles
    WHERE is_active = true AND role IN ('ADMIN','SUPER_ADMIN')
    ORDER BY role DESC, created_at NULLS LAST LIMIT 1;

    IF NEW.status = 'pending_accountant' THEN
      v_title := '📑 Quyết toán mới cần duyệt';
      v_message := format('Quyết toán %s cần Kế toán duyệt', v_code);
      IF v_kt_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_kt_id, 'BUDGET_SETTLEMENT_STATUS', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;
    ELSIF NEW.status = 'pending_ceo' THEN
      v_title := '🔔 Quyết toán cần CEO duyệt cuối';
      v_message := format('Quyết toán %s đã qua Kế toán, chờ CEO duyệt', v_code);
      IF v_admin_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_admin_id, 'BUDGET_SETTLEMENT_STATUS', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;
    ELSIF NEW.status = 'closed' THEN
      v_title := '🔒 Booking đã đóng';
      v_message := format('Quyết toán %s đã được CEO duyệt và booking đã đóng', v_code);
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_CLOSED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;
      IF v_kt_id IS NOT NULL AND v_kt_id IS DISTINCT FROM NEW.created_by THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_kt_id, 'BUDGET_SETTLEMENT_CLOSED', v_title, v_message, 'budget_settlement', NEW.id, 'normal', false);
      END IF;
    ELSIF NEW.status = 'rejected' AND NEW.created_by IS NOT NULL THEN
      v_title := '❌ Quyết toán bị từ chối';
      v_message := format('Quyết toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note,'(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_REJECTED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3c. Leave Request: NV thường KHÔNG gửi ADMIN
CREATE OR REPLACE FUNCTION public.notify_leave_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee RECORD;
  v_title TEXT;
  v_message TEXT;
  v_recipient UUID;
  v_is_manager_level BOOLEAN;
  v_is_admin_level BOOLEAN;
BEGIN
  SELECT e.full_name, e.department_id, e.profile_id, e.position, p.role
    INTO v_employee
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.profile_id
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);

  IF v_employee IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_is_admin_level := COALESCE(v_employee.role, '') IN ('ADMIN','SUPER_ADMIN');
  v_is_manager_level := v_is_admin_level OR COALESCE(v_employee.role, '') IN (
    'HR_MANAGER','MANAGER','GDKD','DIEUHAN'
  ) OR COALESCE(v_employee.position, '') IN (
    'GIAM_DOC','PHO_GIAM_DOC','TRUONG_PHONG','PHO_PHONG'
  );

  IF TG_OP = 'INSERT' THEN
    v_title := CASE WHEN v_is_manager_level
      THEN '📋 Đơn nghỉ phép cấp quản lý'
      ELSE '📋 Đơn xin nghỉ phép mới'
    END;
    v_message := format('%s xin nghỉ %s ngày (%s → %s) - Lý do: %s',
      v_employee.full_name, NEW.total_days,
      to_char(NEW.start_date, 'DD/MM/YYYY'),
      to_char(NEW.end_date, 'DD/MM/YYYY'),
      COALESCE(NEW.reason, 'Không ghi chú'));

    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND id != COALESCE(v_employee.profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
          CASE
            WHEN v_is_admin_level THEN
              -- Admin xin nghỉ → các Admin khác + HR
              role IN ('ADMIN','SUPER_ADMIN','HR_MANAGER')
            WHEN v_is_manager_level THEN
              -- Manager xin nghỉ → HR + ADMIN
              role IN ('ADMIN','SUPER_ADMIN','HR_MANAGER')
            ELSE
              -- NV thường: HR + Manager cùng phòng. KHÔNG gửi ADMIN.
              role IN ('HR_MANAGER','HCNS')
              OR (role IN ('MANAGER','GDKD') AND department_id = v_employee.department_id)
          END
        )
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'LEAVE_REQUEST_NEW', v_title, v_message, 'leave_request', NEW.id, 'high', false);
    END LOOP;

  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('APPROVED', 'REJECTED')
        AND v_employee.profile_id IS NOT NULL THEN
    IF NEW.status = 'APPROVED' THEN
      v_title := '✅ Đơn nghỉ phép được duyệt';
      v_message := format('Đơn nghỉ %s → %s đã được duyệt.',
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY'));
    ELSE
      v_title := '❌ Đơn nghỉ phép bị từ chối';
      v_message := format('Đơn nghỉ %s → %s đã bị từ chối.',
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY'));
    END IF;

    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_employee.profile_id, 'LEAVE_REQUEST_RESULT', v_title, v_message, 'leave_request', NEW.id, 'high', false);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. RPC DASHBOARD FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- 4a. BUSINESS DASHBOARD (gộp 12+ queries → 1 RPC)
CREATE OR REPLACE FUNCTION public.rpc_dashboard_business(
  p_user_id uuid,
  p_scope text,
  p_dept_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_start_month timestamptz := date_trunc('month', now());
  v_start_year timestamptz := date_trunc('year', now());
  v_end_year timestamptz := date_trunc('year', now()) + interval '1 year';
  v_today date := current_date;
  v_stats jsonb;
  v_revenue jsonb;
  v_deadlines jsonb;
BEGIN
  -- Bảo mật: chỉ self hoặc admin/finance
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller;
  IF v_caller IS DISTINCT FROM p_user_id
     AND v_caller_role NOT IN ('ADMIN','SUPER_ADMIN','KETOAN','GDKD','MANAGER','DIEUHAN','HR_MANAGER','HCNS') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- STATS tháng hiện tại
  WITH bk AS (
    SELECT total_value FROM bookings
    WHERE created_at >= v_start_month
      AND (
        p_scope = 'all'
        OR (p_scope = 'team' AND department_id = p_dept_id)
        OR (p_scope = 'self' AND sale_id = p_user_id)
      )
  ),
  ld AS (
    SELECT 1 FROM leads
    WHERE created_at >= v_start_month
      AND (
        p_scope = 'all'
        OR (p_scope = 'team' AND department_id = p_dept_id)
        OR (p_scope = 'self' AND assigned_to = p_user_id)
      )
  ),
  cs AS (
    SELECT 1 FROM customers
    WHERE
      p_scope = 'all'
      OR (p_scope = 'team' AND department_id = p_dept_id)
      OR (p_scope = 'self' AND assigned_sale_id = p_user_id)
  )
  SELECT jsonb_build_object(
    'monthly_revenue', COALESCE((SELECT SUM(total_value) FROM bk), 0),
    'new_bookings', (SELECT COUNT(*) FROM bk),
    'new_leads', (SELECT COUNT(*) FROM ld),
    'customer_count', (SELECT COUNT(*) FROM cs)
  ) INTO v_stats;

  -- REVENUE BY MONTH (12 tháng năm hiện tại)
  WITH bk_year AS (
    SELECT
      EXTRACT(MONTH FROM created_at)::int AS m,
      total_value
    FROM bookings
    WHERE created_at >= v_start_year AND created_at < v_end_year
      AND (
        p_scope = 'all'
        OR (p_scope = 'team' AND department_id = p_dept_id)
        OR (p_scope = 'self' AND sale_id = p_user_id)
      )
  ),
  months AS (
    SELECT generate_series(1,12) AS m
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', 'T' || months.m,
    'value', ROUND(COALESCE(SUM(bk_year.total_value),0) / 1000000.0)
  ) ORDER BY months.m), '[]'::jsonb)
  INTO v_revenue
  FROM months
  LEFT JOIN bk_year ON bk_year.m = months.m
  GROUP BY months.m
  ORDER BY months.m;

  -- DEADLINES hôm nay
  WITH dep AS (
    SELECT b.id, b.code, b.deposit_amount AS amount, 'Đặt cọc' AS type, c.full_name
    FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.deposit_due_at = v_today
      AND (
        p_scope = 'all'
        OR (p_scope = 'team' AND b.department_id = p_dept_id)
        OR (p_scope = 'self' AND b.sale_id = p_user_id)
      )
  ),
  rem AS (
    SELECT b.id, b.code, b.remaining_amount AS amount, 'Thanh toán' AS type, c.full_name
    FROM bookings b LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.remaining_due_at = v_today
      AND (
        p_scope = 'all'
        OR (p_scope = 'team' AND b.department_id = p_dept_id)
        OR (p_scope = 'self' AND b.sale_id = p_user_id)
      )
  ),
  combined AS (
    SELECT * FROM dep UNION ALL SELECT * FROM rem
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'customer', COALESCE(full_name,'N/A'),
    'tour', code,
    'type', type,
    'amount', to_char(COALESCE(amount,0),'FM999,999,999') || 'đ'
  )), '[]'::jsonb) INTO v_deadlines FROM combined;

  RETURN jsonb_build_object(
    'stats', v_stats,
    'revenue_by_month', v_revenue,
    'deadlines', v_deadlines
  );
END;
$$;

-- 4b. PERSONAL DASHBOARD
CREATE OR REPLACE FUNCTION public.rpc_dashboard_personal(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_start_month timestamptz := date_trunc('month', now());
  v_start_year timestamptz := date_trunc('year', now());
  v_end_year timestamptz := date_trunc('year', now()) + interval '1 year';
  v_stats jsonb;
  v_chart jsonb;
BEGIN
  IF v_caller IS DISTINCT FROM p_user_id AND NOT has_any_role(v_caller, ARRAY['ADMIN','SUPER_ADMIN']) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH bk AS (
    SELECT total_value FROM bookings
    WHERE sale_id = p_user_id AND created_at >= v_start_month
  ),
  ld AS (
    SELECT 1 FROM leads
    WHERE assigned_to = p_user_id AND created_at >= v_start_month
  ),
  cs AS (
    SELECT 1 FROM customers WHERE assigned_sale_id = p_user_id
  )
  SELECT jsonb_build_object(
    'my_revenue', COALESCE((SELECT SUM(total_value) FROM bk), 0),
    'my_booking_count', (SELECT COUNT(*) FROM bk),
    'my_lead_count', (SELECT COUNT(*) FROM ld),
    'my_customer_count', (SELECT COUNT(*) FROM cs)
  ) INTO v_stats;

  WITH bk_year AS (
    SELECT EXTRACT(MONTH FROM created_at)::int AS m, total_value
    FROM bookings
    WHERE sale_id = p_user_id AND created_at >= v_start_year AND created_at < v_end_year
  ),
  months AS (SELECT generate_series(1,12) AS m)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month','T'||months.m,
    'value', ROUND(COALESCE(SUM(bk_year.total_value),0)/1000000.0)
  ) ORDER BY months.m), '[]'::jsonb)
  INTO v_chart
  FROM months LEFT JOIN bk_year ON bk_year.m=months.m
  GROUP BY months.m ORDER BY months.m;

  RETURN jsonb_build_object('stats', v_stats, 'monthly_chart', v_chart);
END;
$$;

-- 4c. CEO DASHBOARD
CREATE OR REPLACE FUNCTION public.rpc_dashboard_ceo(p_dept_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  -- Customer overview
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

  -- Pipeline funnel theo status
  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO v_pipeline
  FROM (
    SELECT COALESCE(status,'NEW') AS status, COUNT(*) AS cnt
    FROM leads
    WHERE p_dept_id IS NULL OR department_id = p_dept_id
    GROUP BY status
  ) t;

  -- Top 10 sales theo revenue tháng
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

  -- Revenue 12 tháng
  WITH bk_year AS (
    SELECT EXTRACT(MONTH FROM created_at)::int AS m, total_value
    FROM bookings
    WHERE created_at >= v_start_year AND created_at < v_end_year
      AND (p_dept_id IS NULL OR department_id = p_dept_id)
  ),
  months AS (SELECT generate_series(1,12) AS m)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month','T'||months.m,
    'revenue', ROUND(COALESCE(SUM(bk_year.total_value),0)/1000000.0)
  ) ORDER BY months.m), '[]'::jsonb)
  INTO v_revenue_chart
  FROM months LEFT JOIN bk_year ON bk_year.m=months.m
  GROUP BY months.m ORDER BY months.m;

  RETURN jsonb_build_object(
    'customer_overview', v_customer_overview,
    'pipeline_funnel', v_pipeline,
    'sale_performance', v_sale_perf,
    'revenue_chart', v_revenue_chart
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_business(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_personal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_ceo(uuid) TO authenticated;
