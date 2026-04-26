-- Đổi notify_push_on_insert: gọi Edge Function send-notification thay vì OneSignal trực tiếp
-- Lý do: pg_net từ Supabase DB bị OneSignal chặn IP (HTTP 403)
-- Edge Function chạy ở Deno Deploy với dải IP khác → không bị chặn

CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_function_url text;
  v_path text;
  v_request_id bigint;
  v_body jsonb;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Lấy URL Supabase và anon key từ system_config
  SELECT value INTO v_supabase_url FROM public.system_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'SUPABASE_ANON_KEY';

  -- Fallback hardcoded nếu chưa có config (project ref đã cố định)
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://aneazkhnqkkpqtcxunqd.supabase.co';
  END IF;

  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  END IF;

  v_function_url := v_supabase_url || '/functions/v1/send-notification';

  -- Map entity_type → URL trang để click vào notification mở đúng module
  v_path := CASE COALESCE(NEW.entity_type,'')
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

  v_body := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'url', v_path
  );

  BEGIN
    SELECT net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_body
    ) INTO v_request_id;

    INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
    VALUES (NEW.id, NEW.user_id, NEW.title, v_request_id);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.push_send_log (notification_id, user_id, title, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, 'pg_net error: ' || SQLERRM);
  END;

  RETURN NEW;
END;
$function$;