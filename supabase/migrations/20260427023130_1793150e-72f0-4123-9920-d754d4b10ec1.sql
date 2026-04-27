-- 1) Rewrite rpc_send_test_push: bỏ vòng lặp pg_sleep, trả ngay
CREATE OR REPLACE FUNCTION public.rpc_send_test_push()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_notif_id uuid;
  v_log record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, priority, is_read)
  VALUES (
    v_user_id,
    'TEST_PUSH',
    '🔔 Test push từ Saigon Holiday CRM',
    'Nếu thấy thông báo này trên thiết bị (ngoài tab app), nghĩa là push đã hoạt động!',
    'system',
    'normal',
    false
  )
  RETURNING id INTO v_notif_id;

  SELECT * INTO v_log FROM public.push_send_log WHERE notification_id = v_notif_id LIMIT 1;

  IF v_log IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'stage', 'no_push_log_created', 'notification_id', v_notif_id);
  END IF;

  IF v_log.error IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'stage', 'pre_request', 'error', v_log.error, 'notification_id', v_notif_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'queued', true,
    'notification_id', v_notif_id,
    'request_id', v_log.request_id,
    'hint', 'Đã queue push. Trình duyệt sẽ poll rpc_check_push_status(request_id) để xem kết quả.'
  );
END $$;

-- 2) RPC nhẹ để frontend poll trạng thái response từ pg_net
CREATE OR REPLACE FUNCTION public.rpc_check_push_status(p_request_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_status int;
  v_body text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ready', false, 'error', 'not_authenticated');
  END IF;

  SELECT status_code, content::text INTO v_status, v_body
  FROM net._http_response
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'ready', v_status IS NOT NULL,
    'status_code', v_status,
    'response', LEFT(COALESCE(v_body, ''), 500),
    'hint', CASE
      WHEN v_status IS NULL THEN 'Chưa có response — chờ thêm 1-2 giây'
      WHEN v_status = 403 THEN '⚠️ REST API Key SAI hoặc bị revoke'
      WHEN v_status = 401 THEN 'Sai format Authorization header'
      WHEN v_status = 400 AND v_body LIKE '%not subscribed%' THEN '✅ Key OK — tài khoản này chưa subscribe push trên thiết bị nào'
      WHEN v_status = 400 THEN 'Request body sai format'
      WHEN v_status BETWEEN 200 AND 299 THEN '✅ OneSignal nhận push OK — kiểm tra notification trên màn hình thiết bị'
      ELSE 'Lỗi không xác định — copy response gửi admin'
    END
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rpc_send_test_push() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_check_push_status(bigint) TO authenticated;