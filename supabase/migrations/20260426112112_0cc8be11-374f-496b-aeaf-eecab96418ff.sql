-- 1) Cập nhật trigger gửi push: dùng "Key " prefix theo chuẩn OneSignal v16 mới
--    (Authorization: Basic <key> đã bị deprecate, trả về 403 với key kiểu os_v2_app_*)
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

  -- v16 keys (os_v2_app_*) phải dùng "Key <token>"; legacy keys vẫn còn nhận "Basic"
  -- Dùng "Key" làm mặc định vì OneSignal khuyến nghị format này từ 2024.
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
      url := 'https://api.onesignal.com/notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth_header
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


-- 2) RPC test push: gửi 1 thông báo test cho chính user, đợi response và trả kết quả
CREATE OR REPLACE FUNCTION public.rpc_send_test_push()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_notif_id uuid;
  v_log record;
  v_response record;
  v_status_code int;
  v_response_body text;
  v_attempts int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Insert một notification "test" vào notifications → trigger sẽ tự gọi OneSignal
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, priority, is_read)
  VALUES (
    v_user_id,
    'TEST_PUSH',
    '🔔 Test push từ Saigon Holiday CRM',
    'Nếu bạn thấy thông báo này trên màn hình điện thoại/máy tính (không phải trong app), nghĩa là push đã hoạt động!',
    'system',
    'normal',
    false
  )
  RETURNING id INTO v_notif_id;

  -- Đợi log được ghi (trigger chạy đồng bộ nên sẽ có ngay)
  SELECT * INTO v_log FROM public.push_send_log WHERE notification_id = v_notif_id LIMIT 1;
  IF v_log IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_push_log_created', 'notification_id', v_notif_id);
  END IF;

  IF v_log.error IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'stage', 'pre_request',
      'error', v_log.error,
      'notification_id', v_notif_id
    );
  END IF;

  IF v_log.request_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'stage', 'no_request_id',
      'notification_id', v_notif_id
    );
  END IF;

  -- Poll net._http_response — pg_net gọi async, kết quả sẽ xuất hiện sau ~100-500ms
  WHILE v_attempts < 20 LOOP
    SELECT status_code, content::text AS body
      INTO v_status_code, v_response_body
    FROM net._http_response
    WHERE id = v_log.request_id;

    IF v_status_code IS NOT NULL THEN
      EXIT;
    END IF;

    PERFORM pg_sleep(0.25);
    v_attempts := v_attempts + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_status_code BETWEEN 200 AND 299,
    'status_code', v_status_code,
    'response', LEFT(COALESCE(v_response_body, '(no response yet)'), 500),
    'request_id', v_log.request_id,
    'notification_id', v_notif_id,
    'hint', CASE
      WHEN v_status_code IS NULL THEN 'OneSignal chưa trả lời sau 5s — kiểm tra mạng từ Supabase'
      WHEN v_status_code = 403 THEN 'REST API Key SAI hoặc không có quyền — vào dashboard OneSignal → Settings → Keys & IDs → copy lại "App API Key"'
      WHEN v_status_code = 400 AND v_response_body LIKE '%All included players are not subscribed%' THEN 'Key đúng nhưng tài khoản này chưa đăng ký push trên thiết bị nào — bấm "Bật thông báo" trước'
      WHEN v_status_code BETWEEN 200 AND 299 THEN 'Gửi thành công! Nếu vẫn không thấy thông báo trên thiết bị, kiểm tra: (1) đã bật toggle push, (2) HĐH không chặn thông báo, (3) đã mở app ngoài iframe ít nhất 1 lần'
      ELSE 'Lỗi không xác định — copy response gửi cho admin'
    END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_send_test_push() TO authenticated;


-- 3) View health check cho admin: 20 push gần nhất + status từ OneSignal
CREATE OR REPLACE VIEW public.v_push_health AS
SELECT
  psl.id,
  psl.created_at,
  psl.title,
  psl.user_id,
  psl.error AS pre_request_error,
  psl.request_id,
  hr.status_code,
  LEFT(hr.content::text, 300) AS response_body,
  hr.error_msg AS response_error
FROM public.push_send_log psl
LEFT JOIN net._http_response hr ON hr.id = psl.request_id
ORDER BY psl.created_at DESC;

-- View access: chỉ admin xem được
ALTER VIEW public.v_push_health OWNER TO postgres;
GRANT SELECT ON public.v_push_health TO authenticated;
