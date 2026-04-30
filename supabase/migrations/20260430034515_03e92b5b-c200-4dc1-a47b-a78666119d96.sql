
-- =========================================================
-- FIX 1: notify_new_online_lead — thêm Sale cùng dept
-- FIX 9: chuẩn hóa type UPPER_SNAKE
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_new_online_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
BEGIN
  v_title := format('🌐 Lead mới từ %s', COALESCE(NEW.channel, 'online'));
  v_message := format('%s — %s — %s',
    COALESCE(NEW.full_name, '(chưa có tên)'),
    COALESCE(NEW.phone, '(chưa có SĐT)'),
    COALESCE(NEW.interest_type, 'Chưa rõ nhu cầu'));

  -- GDKD + MANAGER toàn cty
  FOR v_recipient IN
    SELECT id FROM profiles
    WHERE is_active = true AND role IN ('GDKD','MANAGER','ADMIN','SUPER_ADMIN')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_recipient, 'NEW_ONLINE_LEAD', v_title, v_message, 'lead', NEW.id, 'normal', false);
  END LOOP;

  -- Sale cùng department (nếu có)
  IF NEW.department_id IS NOT NULL THEN
    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND department_id = NEW.department_id
        AND role LIKE 'SALE_%'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'NEW_ONLINE_LEAD', v_title, v_message, 'lead', NEW.id, 'normal', false);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- FIX 2: budget_estimate — thêm xác nhận cho người tạo
-- FIX 9: chuẩn hóa UPPER
-- =========================================================
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
  v_booking_code text;
  v_amount_str text;
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);
  SELECT b.code INTO v_booking_code FROM bookings b WHERE b.id = NEW.booking_id;
  v_amount_str := to_char(COALESCE(NEW.total_estimated, 0), 'FM999,999,999,999');

  IF (TG_OP = 'INSERT' AND COALESCE(NEW.status, '') = 'pending_review')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending_review') THEN
    v_title := format('📋 Dự toán chờ duyệt: %s', v_code);
    v_message := format('Booking %s — %s VNĐ',
      COALESCE(v_booking_code, '(chưa có)'), v_amount_str);

    -- Notify KETOAN + ADMIN
    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true AND role IN ('KETOAN','ADMIN','SUPER_ADMIN')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'BUDGET_ESTIMATE_PENDING', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    END LOOP;

    -- ✅ NEW: Notify created_by (acknowledgment loop)
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (
        NEW.created_by,
        'BUDGET_ESTIMATE_SUBMITTED',
        format('✅ Đã gửi dự toán: %s', v_code),
        format('Đang chờ Kế toán xác nhận — %s VNĐ', v_amount_str),
        'budget_estimate', NEW.id, 'normal', false
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('approved','rejected') AND NEW.created_by IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      v_title := '✅ Dự toán đã được duyệt';
      v_message := format('Dự toán %s đã được Kế toán duyệt', v_code);
    ELSE
      v_title := '❌ Dự toán bị từ chối';
      v_message := format('Dự toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note, '(không ghi lý do)'));
    END IF;
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (NEW.created_by, 'BUDGET_ESTIMATE_RESULT', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- FIX 5: notify_new_employee — thêm KETOAN
-- FIX 9: UPPER
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_new_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
  v_dept_name text;
  v_dept_manager_id uuid;
BEGIN
  SELECT name, manager_id INTO v_dept_name, v_dept_manager_id
  FROM departments WHERE id = NEW.department_id;

  v_title := format('👤 Nhân viên mới: %s', NEW.full_name);
  v_message := format('Phòng %s — Vị trí: %s',
    COALESCE(v_dept_name, '(chưa gán)'),
    COALESCE(NEW.position, '(chưa rõ)'));

  -- HR + KETOAN + ADMIN
  FOR v_recipient IN
    SELECT id FROM profiles
    WHERE is_active = true AND role IN ('HR_MANAGER','HCNS','KETOAN','ADMIN','SUPER_ADMIN')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_recipient, 'NEW_EMPLOYEE', v_title, v_message, 'employee', NEW.id, 'normal', false);
  END LOOP;

  -- Manager phòng
  IF v_dept_manager_id IS NOT NULL
     AND v_dept_manager_id IS DISTINCT FROM NEW.profile_id
     AND NOT EXISTS (
       SELECT 1 FROM profiles
       WHERE id = v_dept_manager_id
         AND role IN ('HR_MANAGER','HCNS','KETOAN','ADMIN','SUPER_ADMIN')
     ) THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_dept_manager_id, 'NEW_EMPLOYEE', v_title, v_message, 'employee', NEW.id, 'normal', false);
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- FIX 6: notify_lead_reassign — trigger mới
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_lead_reassign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (
      NEW.assigned_to,
      'LEAD_ASSIGNED',
      format('📌 Lead mới được giao: %s', COALESCE(NEW.full_name, '(không tên)')),
      format('SĐT: %s — %s', COALESCE(NEW.phone, '(chưa có)'), COALESCE(NEW.interest_type, 'Chưa rõ nhu cầu')),
      'lead', NEW.id, 'high', false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_reassign ON public.leads;
CREATE TRIGGER trg_notify_lead_reassign
  AFTER UPDATE OF assigned_to ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lead_reassign();

-- =========================================================
-- FIX 7: notify_booking_status_change — trigger mới
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_name TEXT;
  v_recipient uuid;
  v_amount_str text;
BEGIN
  SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;
  v_amount_str := to_char(COALESCE(NEW.total_value, 0), 'FM999,999,999,999');

  IF TG_OP = 'INSERT' THEN
    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true AND role IN ('GDKD','DIEUHAN','ADMIN','SUPER_ADMIN')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (
        v_recipient,
        'BOOKING_NEW',
        format('🆕 Booking mới: %s', COALESCE(NEW.code, '')),
        format('KH: %s — %s VNĐ', COALESCE(v_customer_name, '(chưa rõ)'), v_amount_str),
        'booking', NEW.id, 'high', false
      );
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.sale_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (
        NEW.sale_id,
        'BOOKING_STATUS',
        format('🔄 Booking %s → %s', COALESCE(NEW.code, ''), NEW.status),
        format('KH: %s', COALESCE(v_customer_name, '')),
        'booking', NEW.id, 'normal', false
      );
    END IF;

    IF NEW.status IN ('confirmed','completed','CONFIRMED','COMPLETED') THEN
      FOR v_recipient IN
        SELECT id FROM profiles WHERE is_active = true AND role = 'KETOAN'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (
          v_recipient,
          'BOOKING_STATUS',
          format('💰 Booking xác nhận: %s', COALESCE(NEW.code, '')),
          format('Cần lập hóa đơn / theo dõi thanh toán — %s VNĐ', v_amount_str),
          'booking', NEW.id, 'high', false
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_status ON public.bookings;
CREATE TRIGGER trg_notify_booking_status
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- =========================================================
-- FIX 8: notify_quotation_sent — trigger mới
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_quotation_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_name text;
  v_amount_str text;
BEGIN
  IF NEW.status IN ('SENT','sent') AND (OLD.status IS NULL OR OLD.status NOT IN ('SENT','sent')) THEN
    SELECT full_name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;
    v_amount_str := to_char(COALESCE(NEW.total_amount, 0), 'FM999,999,999,999');

    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    SELECT
      p.id,
      'QUOTATION_SENT',
      format('📤 Báo giá đã gửi KH: %s', COALESCE(NEW.code, '')),
      format('KH: %s — %s VNĐ', COALESCE(v_customer_name, '(chưa rõ)'), v_amount_str),
      'quotation', NEW.id, 'normal', false
    FROM profiles p
    WHERE p.is_active = true AND p.role IN ('GDKD','MANAGER','ADMIN','SUPER_ADMIN');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quotation_sent ON public.quotations;
CREATE TRIGGER trg_notify_quotation_sent
  AFTER INSERT OR UPDATE OF status ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quotation_sent();
