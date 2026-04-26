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
  v_auth_header text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT value INTO v_app_id FROM public.system_config WHERE key = 'ONESIGNAL_APP_ID';
  SELECT value INTO v_rest_key FROM public.system_config WHERE key = 'ONESIGNAL_REST_API_KEY';

  IF v_app_id IS NULL OR v_rest_key IS NULL OR v_app_id = '' OR v_rest_key = '' THEN
    INSERT INTO public.push_send_log (notification_id, user_id, title, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, 'OneSignal credentials missing in system_config');
    RETURN NEW;
  END IF;

  IF v_rest_key LIKE 'os_v2_%' THEN
    v_auth_header := 'Key ' || v_rest_key;
  ELSE
    v_auth_header := 'Basic ' || v_rest_key;
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
      url := 'https://onesignal.com/api/v1/notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth_header
      ),
      body := jsonb_build_object(
        'app_id', v_app_id,
        'channel_for_external_user_ids', 'push',
        'include_external_user_ids', jsonb_build_array(NEW.user_id::text),
        'headings', jsonb_build_object('en', COALESCE(NEW.title, 'Thông báo mới')),
        'contents', jsonb_build_object('en', COALESCE(NEW.message, '')),
        'url', v_full_url,
        'priority', CASE WHEN COALESCE(NEW.priority,'') IN ('high','urgent') THEN 10 ELSE 5 END
      )
    ) INTO v_request_id;

    INSERT INTO public.push_send_log (notification_id, user_id, title, request_id, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, v_request_id, NULL);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.push_send_log (notification_id, user_id, title, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, 'http_post failed: ' || SQLERRM);
  END;

  RETURN NEW;
END;
$function$;