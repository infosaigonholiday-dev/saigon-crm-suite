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

  SELECT value INTO v_app_id FROM public.system_config WHERE key = 'ONESIGNAL_APP_ID';
  SELECT value INTO v_rest_key FROM public.system_config WHERE key = 'ONESIGNAL_REST_API_KEY';

  IF v_app_id IS NULL OR v_rest_key IS NULL OR v_app_id = '' OR v_rest_key = '' THEN
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
    PERFORM net.http_post(
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