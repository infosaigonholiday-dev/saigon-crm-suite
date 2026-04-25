
-- 1. Mở rộng audit_logs.action constraint cho phép 'SYSTEM'
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN ('CREATE','UPDATE','DELETE','STATUS_CHANGE','REASSIGN','LOGIN','LOGOUT','SYSTEM'));

-- 2. Function gửi Web Push khi notification mới được tạo
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_func_url text := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_url text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  v_url := CASE COALESCE(NEW.entity_type,'')
    WHEN 'lead' THEN '/tiem-nang'
    WHEN 'customer' THEN '/khach-hang'
    WHEN 'booking' THEN '/dat-tour'
    WHEN 'budget_estimate' THEN '/tai-chinh'
    WHEN 'budget_settlement' THEN '/tai-chinh'
    WHEN 'transaction' THEN '/tai-chinh'
    WHEN 'leave_request' THEN '/quan-ly-nghi-phep'
    WHEN 'contract' THEN '/hop-dong'
    WHEN 'payment' THEN '/thanh-toan'
    WHEN 'employee' THEN '/nhan-su'
    ELSE '/canh-bao'
  END;

  BEGIN
    PERFORM net.http_post(
      url := v_func_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', COALESCE(NEW.title,'Thông báo mới'),
        'message', COALESCE(NEW.message,''),
        'url', v_url,
        'tag', COALESCE(NEW.type,'notif') || '-' || NEW.id::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.audit_logs (action, table_name, record_id, change_summary, new_data, created_at)
      VALUES (
        'SYSTEM',
        'notifications',
        NEW.id,
        'Push send failed: ' || SQLERRM,
        jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title, 'error', SQLERRM),
        now()
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

-- 3. Gắn trigger
DROP TRIGGER IF EXISTS trg_notifications_push ON public.notifications;
CREATE TRIGGER trg_notifications_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_insert();

-- 4. Bỏ block net.http_post trong các trigger cũ để tránh gửi 2 lần
-- 4a. notify_leave_request_change
CREATE OR REPLACE FUNCTION public.notify_leave_request_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employee RECORD;
  v_title TEXT;
  v_message TEXT;
  v_recipient UUID;
  v_is_manager_level BOOLEAN;
  v_is_admin_level BOOLEAN;
  v_other_admin_count INT;
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
    'HR_MANAGER','HCNS','MANAGER','GDKD','DIEUHAN'
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

    IF v_is_admin_level THEN
      SELECT COUNT(*) INTO v_other_admin_count
      FROM profiles
      WHERE is_active = true AND role IN ('ADMIN','SUPER_ADMIN')
        AND id != COALESCE(v_employee.profile_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;

    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND id != COALESCE(v_employee.profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
          CASE
            WHEN v_is_admin_level THEN
              role IN ('ADMIN','SUPER_ADMIN')
              OR (v_other_admin_count = 0 AND role = 'HR_MANAGER')
            WHEN v_is_manager_level THEN
              role IN ('ADMIN','SUPER_ADMIN','HR_MANAGER')
            ELSE
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
$function$;

-- 4b. notify_budget_estimate_change
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
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  IF (TG_OP='INSERT' AND COALESCE(NEW.status,'') = 'pending_review')
     OR (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending_review') THEN
    v_title := '📋 Dự toán mới cần duyệt';
    v_message := format('Dự toán %s cần Kế toán duyệt', v_code);
    FOR v_recipient IN
      SELECT id FROM profiles WHERE is_active = true AND role IN ('KETOAN','ADMIN','SUPER_ADMIN')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'BUDGET_ESTIMATE_NEW', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    END LOOP;

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
$function$;

-- 4c. notify_budget_settlement_change
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
  v_target_roles text[];
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'pending_accountant' THEN
      v_title := '📑 Quyết toán mới cần duyệt'; v_message := format('Quyết toán %s cần Kế toán duyệt', v_code);
      v_target_roles := ARRAY['KETOAN','ADMIN','SUPER_ADMIN'];
    ELSIF NEW.status = 'pending_ceo' THEN
      v_title := '🔔 Quyết toán cần CEO duyệt cuối'; v_message := format('Quyết toán %s đã qua Kế toán, chờ CEO duyệt', v_code);
      v_target_roles := ARRAY['ADMIN','SUPER_ADMIN'];
    ELSIF NEW.status = 'closed' THEN
      v_title := '🔒 Booking đã đóng'; v_message := format('Quyết toán %s đã được CEO duyệt và booking đã đóng', v_code);
      v_target_roles := ARRAY['KETOAN','DIEUHAN'];
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_CLOSED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;
    ELSIF NEW.status = 'rejected' AND NEW.created_by IS NOT NULL THEN
      v_title := '❌ Quyết toán bị từ chối'; v_message := format('Quyết toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note,'(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_REJECTED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      RETURN NEW;
    END IF;

    IF v_target_roles IS NOT NULL THEN
      FOR v_recipient IN
        SELECT id FROM profiles WHERE is_active = true AND role = ANY(v_target_roles)
      LOOP
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_recipient, 'BUDGET_SETTLEMENT_STATUS', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4d. notify_transaction_approval
CREATE OR REPLACE FUNCTION public.notify_transaction_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient uuid;
  v_title text; v_message text;
  v_target_roles text[];
  v_amount text;
BEGIN
  v_amount := to_char(COALESCE(NEW.amount,0),'FM999,999,999,999');

  IF TG_OP='INSERT' AND NEW.approval_status = 'PENDING_HR' THEN
    v_title := '💼 Chi phí HCNS mới cần duyệt';
    v_message := format('Chi phí %s VNĐ cần HR duyệt: %s', v_amount, COALESCE(NEW.description,''));
    v_target_roles := ARRAY['HR_MANAGER','ADMIN','SUPER_ADMIN'];
  ELSIF TG_OP='UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NEW.approval_status = 'PENDING_REVIEW' THEN
      v_title := '📌 Chi phí chờ Kế toán xác nhận';
      v_message := format('Chi phí %s VNĐ đã qua HR, chờ Kế toán', v_amount);
      v_target_roles := ARRAY['KETOAN','ADMIN','SUPER_ADMIN'];
    ELSIF NEW.approval_status = 'APPROVED' AND NEW.submitted_by IS NOT NULL THEN
      v_title := '✅ Chi phí đã được duyệt';
      v_message := format('Chi phí %s VNĐ đã được Kế toán duyệt', v_amount);
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.submitted_by, 'TRANSACTION_APPROVED', v_title, v_message, 'transaction', NEW.id, 'normal', false);
      RETURN NEW;
    ELSIF NEW.approval_status = 'REJECTED' AND NEW.submitted_by IS NOT NULL THEN
      v_title := '❌ Chi phí bị từ chối';
      v_message := format('Chi phí %s VNĐ bị từ chối: %s', v_amount, COALESCE(NEW.review_note,'(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.submitted_by, 'TRANSACTION_REJECTED', v_title, v_message, 'transaction', NEW.id, 'high', false);
      RETURN NEW;
    END IF;
  END IF;

  IF v_target_roles IS NOT NULL THEN
    FOR v_recipient IN
      SELECT id FROM profiles WHERE is_active = true AND role = ANY(v_target_roles)
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'TRANSACTION_APPROVAL', v_title, v_message, 'transaction', NEW.id, 'high', false);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
