
-- 1. Bảng cấu hình hệ thống (lưu OneSignal credentials)
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Không có policy nào → user thường không truy cập được, chỉ service_role bypass RLS đọc được.
-- (Cố tình không tạo policy để giữ kín tuyệt đối với tất cả role kể cả ADMIN qua client.)

COMMENT ON TABLE public.system_config IS 'System-wide private configuration (e.g. third-party API keys). Service role only.';

-- 2. Đánh dấu DEPRECATED bảng push_subscriptions cũ
COMMENT ON TABLE public.push_subscriptions IS 'DEPRECATED 2026-04-26 — replaced by OneSignal. Kept for backup only.';

-- 3. Cập nhật trigger gửi push: dùng OneSignal REST API
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
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Đọc credentials OneSignal từ system_config (service_role bypass RLS, trigger chạy SECURITY DEFINER)
  SELECT value INTO v_app_id FROM public.system_config WHERE key = 'ONESIGNAL_APP_ID';
  SELECT value INTO v_rest_key FROM public.system_config WHERE key = 'ONESIGNAL_REST_API_KEY';

  -- Nếu chưa cấu hình thì bỏ qua (không crash trigger)
  IF v_app_id IS NULL OR v_rest_key IS NULL OR v_app_id = '' OR v_rest_key = '' THEN
    RETURN NEW;
  END IF;

  -- Map entity → URL nội bộ
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
    PERFORM net.http_post(
      url := 'https://api.onesignal.com/notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Key ' || v_rest_key
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
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.audit_logs (action, table_name, record_id, change_summary, new_data, created_at)
      VALUES (
        'SYSTEM',
        'notifications',
        NEW.id,
        'OneSignal push send failed: ' || SQLERRM,
        jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title, 'error', SQLERRM),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_push_on_insert: failed to log push error: %', SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$function$;
