CREATE OR REPLACE FUNCTION public.rpc_send_test_push()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_notif_id uuid;
  v_log record;
  v_status_code int;
  v_response_body text;
  v_attempts int := 0;
  v_max_attempts int := 60;  -- 60 × 0.5s = 30s
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, priority, is_read)
  VALUES (
    v_user_id,
    'TEST_PUSH',
    '🔔 Test push từ Saigon Holiday CRM',
    'Nếu thấy thông báo này trên màn hình điện thoại/máy tính (không phải trong app), nghĩa là push đã hoạt động!',
    'system',
    'normal',
    false
  )
  RETURNING id INTO v_notif_id;

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

  -- Poll net._http_response — pg_net ghi response async, có thể mất tới 30s
  WHILE v_attempts < v_max_attempts LOOP
    SELECT status_code, content::text AS body
      INTO v_status_code, v_response_body
    FROM net._http_response
    WHERE id = v_log.request_id;

    IF v_status_code IS NOT NULL THEN
      EXIT;
    END IF;

    PERFORM pg_sleep(0.5);
    v_attempts := v_attempts + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_status_code BETWEEN 200 AND 299,
    'status_code', v_status_code,
    'response', LEFT(COALESCE(v_response_body, '(không có response sau 30s)'), 500),
    'request_id', v_log.request_id,
    'notification_id', v_notif_id,
    'waited_seconds', (v_attempts * 0.5),
    'hint', CASE
      WHEN v_status_code IS NULL THEN 'OneSignal chưa trả lời sau 30s — có thể pg_net bị block hoặc network của Supabase có vấn đề. Vào dashboard OneSignal xem Delivery log.'
      WHEN v_status_code = 403 THEN '⚠️ REST API Key SAI hoặc đã bị revoke. Vào dashboard.onesignal.com → Settings → Keys & IDs → tạo App API Key MỚI → UPDATE system_config SET value=''<key mới>'' WHERE key=''ONESIGNAL_REST_API_KEY''.'
      WHEN v_status_code = 401 THEN 'Không xác thực được. Có thể format header sai (cần "Authorization: Key <token>" cho key os_v2_*).'
      WHEN v_status_code = 400 AND v_response_body LIKE '%All included players are not subscribed%' THEN '✅ Key OK! Chỉ là tài khoản này chưa subscribe push trên thiết bị nào — bấm "Bật thông báo" trước rồi test lại.'
      WHEN v_status_code = 400 THEN 'Request body sai format. Xem response để biết field nào bị lỗi.'
      WHEN v_status_code BETWEEN 200 AND 299 THEN '✅ Gửi thành công! Nếu không thấy notification trên thiết bị, kiểm tra: (1) toggle push đã ON, (2) HĐH không chặn, (3) đã mở app ngoài iframe ít nhất 1 lần.'
      ELSE 'Lỗi không xác định — copy response gửi cho admin.'
    END
  );
END;
$function$;