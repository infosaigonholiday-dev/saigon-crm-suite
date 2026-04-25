
-- Cập nhật hàm trigger để gửi header x-internal-secret tới send-notification
-- Giá trị secret = service_role_key (Edge Function so khớp với SUPABASE_SERVICE_ROLE_KEY env var)
-- Lưu ý: hàm này SECURITY DEFINER, chỉ chạy nội bộ, không expose ra client.

CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_func_url text := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_internal_secret text;
  v_url text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Lấy service role key từ vault để dùng làm internal secret
  -- Nếu vault chưa có thì fallback null (Edge Function sẽ fail và log)
  BEGIN
    SELECT decrypted_secret INTO v_internal_secret
    FROM vault.decrypted_secrets
    WHERE name = 'SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_internal_secret := NULL;
  END;

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
        'Authorization','Bearer ' || v_anon_key,
        'x-internal-secret', COALESCE(v_internal_secret, '')
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
