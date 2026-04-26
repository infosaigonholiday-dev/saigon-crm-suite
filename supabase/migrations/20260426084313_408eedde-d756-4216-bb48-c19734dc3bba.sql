-- ============================================================
-- 1) Xóa hoàn toàn bảng push_subscriptions cũ (chỉ dùng OneSignal)
-- ============================================================
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

-- ============================================================
-- 2) Bảng log nội bộ — debug push qua OneSignal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id uuid,
  title text,
  url text,
  request_id bigint,            -- id từ net.http_post (join với net._http_response.id)
  error text,                   -- nếu trigger gặp lỗi tại bước gọi http_post
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_send_log_created ON public.push_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_send_log_notification ON public.push_send_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_send_log_request ON public.push_send_log(request_id);

ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.push_send_log IS 'Log nội bộ cho push notification qua OneSignal. Service role only.';

-- ============================================================
-- 3) Cập nhật trigger gửi push — lưu request_id để debug
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app_id text;
  v_rest_key text;
  v_url text;
  v_full_url text;
  v_origin text := 'https://app.saigonholiday.vn';
  v_request_id bigint;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT value INTO v_app_id FROM public.system_config WHERE key = 'ONESIGNAL_APP_ID';
  SELECT value INTO v_rest_key FROM public.system_config WHERE key = 'ONESIGNAL_REST_API_KEY';

  IF v_app_id IS NULL OR v_rest_key IS NULL OR v_app_id = '' OR v_rest_key = '' THEN
    -- Không cấu hình → bỏ qua nhưng log lại để admin biết
    INSERT INTO public.push_send_log (notification_id, user_id, title, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, 'OneSignal credentials missing in system_config');
    RETURN NEW;
  END IF;

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
  v_full_url := v_origin || v_url;

  BEGIN
    SELECT net.http_post(
      url := 'https://api.onesignal.com/notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Basic ' || v_rest_key
      ),
      body := jsonb_build_object(
        'app_id', v_app_id,
        'target_channel', 'push',
        'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.user_id::text)),
        'headings', jsonb_build_object('en', COALESCE(NEW.title,'Thông báo mới'), 'vi', COALESCE(NEW.title,'Thông báo mới')),
        'contents', jsonb_build_object('en', COALESCE(NEW.message,''), 'vi', COALESCE(NEW.message,'')),
        'web_url', v_full_url,
        'web_push_topic', COALESCE(NEW.type,'notif') || '-' || NEW.id::text,
        'priority', 10
      )
    ) INTO v_request_id;

    INSERT INTO public.push_send_log (notification_id, user_id, title, url, request_id)
    VALUES (NEW.id, NEW.user_id, NEW.title, v_full_url, v_request_id);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.push_send_log (notification_id, user_id, title, url, error)
      VALUES (NEW.id, NEW.user_id, NEW.title, v_full_url, SQLERRM);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_push_on_insert: failed to write push_send_log: %', SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$function$;
