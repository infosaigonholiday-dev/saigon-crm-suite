
-- ===== Layer 1.1: Mở rộng notifications =====
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_notif_unread_age 
  ON public.notifications(user_id, created_at) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notif_dedup 
  ON public.notifications(user_id, entity_id, type, created_at);

-- ===== Layer 1.2: Trigger auto set read_at =====
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read IS NULL OR OLD.is_read = false) THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_notification_read_at ON public.notifications;
CREATE TRIGGER trg_set_notification_read_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_read_at();

-- ===== Layer 1.3: Trigger leave_requests notify =====
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_leave_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_user_id UUID;
  v_func_url TEXT := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_title TEXT;
  v_message TEXT;
  v_recipient UUID;
BEGIN
  -- Lấy thông tin nhân viên
  SELECT e.full_name, e.department_id, e.profile_id
    INTO v_employee
  FROM employees e
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);

  IF v_employee IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ===== INSERT: Notify HR + Manager dept =====
  IF TG_OP = 'INSERT' THEN
    v_title := '📋 Đơn xin nghỉ phép mới';
    v_message := format('%s xin nghỉ %s ngày (%s → %s) - Lý do: %s',
      v_employee.full_name,
      NEW.total_days,
      to_char(NEW.start_date, 'DD/MM/YYYY'),
      to_char(NEW.end_date, 'DD/MM/YYYY'),
      COALESCE(NEW.reason, 'Không ghi chú')
    );

    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND (
          role IN ('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER', 'HCNS')
          OR (role IN ('MANAGER', 'GDKD') AND department_id = v_employee.department_id)
        )
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'LEAVE_REQUEST_NEW', v_title, v_message, 'leave_request', NEW.id, 'high', false);

      -- Fire web push (best effort, non-blocking)
      BEGIN
        PERFORM net.http_post(
          url := v_func_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := jsonb_build_object(
            'user_id', v_recipient,
            'title', v_title,
            'message', v_message,
            'url', '/quan-ly-nghi-phep',
            'tag', 'LEAVE_REQUEST_NEW-' || NEW.id
          )
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;

  -- ===== UPDATE status: Notify employee =====
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

    BEGIN
      PERFORM net.http_post(
        url := v_func_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'user_id', v_employee.profile_id,
          'title', v_title,
          'message', v_message,
          'url', '/quan-ly-nghi-phep',
          'tag', 'LEAVE_REQUEST_RESULT-' || NEW.id
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_leave_request ON public.leave_requests;
CREATE TRIGGER trg_notify_leave_request
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_request_change();
