-- =====================================================
-- A1. MỞ RỘNG TRIGGER notify_budget_estimate_change
-- Notify TẤT CẢ KETOAN + ADMIN/SUPER_ADMIN (thay vì 1 người)
-- Message kèm booking code + total_estimated
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_budget_estimate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Khi chuyển sang pending_review → notify TẤT CẢ KETOAN + ADMIN
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.status, '') = 'pending_review')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending_review') THEN
    v_title := format('📋 Dự toán chờ duyệt: %s', v_code);
    v_message := format('Booking %s — %s VNĐ',
      COALESCE(v_booking_code, '(chưa có)'),
      v_amount_str);

    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND role IN ('KETOAN', 'ADMIN', 'SUPER_ADMIN')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'budget_estimate_pending', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    END LOOP;

  -- Approved/Rejected → notify created_by (giữ logic cũ)
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('approved', 'rejected') AND NEW.created_by IS NOT NULL THEN
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
$function$;

-- =====================================================
-- A2. MỞ RỘNG TRIGGER notify_budget_settlement_change
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_budget_settlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
  v_code text;
  v_booking_code text;
  v_variance numeric;
  v_variance_str text;
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);
  SELECT b.code INTO v_booking_code FROM bookings b WHERE b.id = NEW.booking_id;
  v_variance := COALESCE(NEW.total_actual, 0) - COALESCE(NEW.total_estimated, 0);
  v_variance_str := to_char(v_variance, 'FM999,999,999,999');

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    IF NEW.status = 'pending_accountant' THEN
      v_title := format('📑 Quyết toán chờ duyệt: %s', v_code);
      v_message := format('Booking %s — Chênh lệch: %s VNĐ',
        COALESCE(v_booking_code, '(chưa có)'),
        v_variance_str);

      FOR v_recipient IN
        SELECT id FROM profiles
        WHERE is_active = true AND role = 'KETOAN'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_recipient, 'budget_settlement_pending', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END LOOP;

    ELSIF NEW.status = 'pending_ceo' THEN
      v_title := format('🔔 Quyết toán chờ CEO duyệt: %s', v_code);
      v_message := format('Booking %s — Chênh lệch: %s VNĐ',
        COALESCE(v_booking_code, '(chưa có)'),
        v_variance_str);

      FOR v_recipient IN
        SELECT id FROM profiles
        WHERE is_active = true AND role IN ('ADMIN', 'SUPER_ADMIN')
      LOOP
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_recipient, 'budget_settlement_pending', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END LOOP;

    ELSIF NEW.status = 'closed' THEN
      v_title := '🔒 Booking đã đóng';
      v_message := format('Quyết toán %s đã được CEO duyệt và booking đã đóng', v_code);
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_CLOSED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;

    ELSIF NEW.status = 'rejected' AND NEW.created_by IS NOT NULL THEN
      v_title := '❌ Quyết toán bị từ chối';
      v_message := format('Quyết toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note, '(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_REJECTED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- B3. TRIGGER: Lead mới qua kênh online (FB/ZALO)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_new_online_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient uuid;
  v_title text;
  v_message text;
BEGIN
  v_title := format('🌐 Lead mới từ %s', NEW.channel);
  v_message := format('%s — %s — %s',
    COALESCE(NEW.full_name, '(chưa có tên)'),
    COALESCE(NEW.phone, '(chưa có SĐT)'),
    COALESCE(NEW.interest_type, 'Chưa rõ nhu cầu'));

  FOR v_recipient IN
    SELECT id FROM profiles
    WHERE is_active = true AND role IN ('GDKD', 'MANAGER')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_recipient, 'new_online_lead', v_title, v_message, 'lead', NEW.id, 'normal', false);
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_online_lead ON public.leads;
CREATE TRIGGER trg_notify_new_online_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  WHEN (NEW.channel IN ('FB', 'ZALO'))
  EXECUTE FUNCTION public.notify_new_online_lead();

-- =====================================================
-- C2. TRIGGER: Nhân viên mới onboard
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_new_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- HR_MANAGER + HCNS active
  FOR v_recipient IN
    SELECT id FROM profiles
    WHERE is_active = true AND role IN ('HR_MANAGER', 'HCNS')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_recipient, 'new_employee', v_title, v_message, 'employee', NEW.id, 'normal', false);
  END LOOP;

  -- Manager phòng (nếu khác HR và khác chính NV mới)
  IF v_dept_manager_id IS NOT NULL
     AND v_dept_manager_id IS DISTINCT FROM NEW.profile_id
     AND NOT EXISTS (
       SELECT 1 FROM profiles
       WHERE id = v_dept_manager_id AND role IN ('HR_MANAGER', 'HCNS')
     ) THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_dept_manager_id, 'new_employee', v_title, v_message, 'employee', NEW.id, 'normal', false);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_employee ON public.employees;
CREATE TRIGGER trg_notify_new_employee
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_employee();