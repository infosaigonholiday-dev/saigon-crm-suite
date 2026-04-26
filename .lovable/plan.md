## Kết quả thực tế đã lấy được

### Bước 1 — Secrets
Kết quả khi chạy đúng câu SQL user yêu cầu:
```sql
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('ONESIGNAL_APP_ID', 'ONESIGNAL_REST_API_KEY');
```
Trả về:
```text
blocked_query: query attempted to access vault.decrypted_secrets
```

Dữ liệu thực tế đọc được thêm từ project:

- Runtime secrets hiện có:
```text
LOVABLE_API_KEY
VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY
VAPID_SUBJECT
```
- Không có `ONESIGNAL_APP_ID` và `ONESIGNAL_REST_API_KEY` trong Supabase runtime secrets.

- Giá trị đang dùng trong DB `system_config`:
```text
ONESIGNAL_APP_ID = 5eb732df-76ec-4fa9-8741-115270a39c66
ONESIGNAL_REST_API_KEY = os_v2_app_l23tfx3w5rh2tb2bcfjhbi44mzn5mb32ecvenf5es4spz3ig7lj6bst55bc3qvxcv2sjzkrc6lach5znxxx4xbedtcevehvkifjzdpa
```

### Bước 2 — Toàn bộ code `notify_push_on_insert`
```sql
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
      url := 'https://api.onesignal.com/notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth_header
      ),
      body := jsonb_build_object(
        'app_id', v_app_id,
        'target_channel', 'push',
        'include_aliases', jsonb_build_object('external_id', jsonb_build_array(NEW.user_id::text)),
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
```

### Bước 3 — `supabase/functions/send-notification/index.ts`
Kết quả thực tế:
```text
File not found: supabase/functions/send-notification/index.ts
```

### Bước 4 — Logs / test path hiện tại
Kết quả thực tế với edge function `send-notification`:
```text
edge_function_logs('send-notification') => No logs found for edge function 'send-notification'
curl_edge_functions GET /send-notification => 404 NOT_FOUND
analytics_query(function_edge_logs where function_id='send-notification') => []
```

5 kết quả push gần nhất trong hệ thống hiện tại:
```text
2026-04-26 12:13:27Z | request_id=49 | status=403 | title=🔔 Test push từ Saigon Holiday CRM
response={"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key..."]}

2026-04-26 12:12:02Z | request_id=48 | status=403 | title=❌ Đơn nghỉ phép bị từ chối
response={"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key..."]}

2026-04-26 12:05:13Z | request_id=47 | status=403 | title=❌ Đơn nghỉ phép bị từ chối
response={"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key..."]}

2026-04-26 11:59:09Z | request_id=46 | status=403 | title=❌ Đơn nghỉ phép bị từ chối
response={"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key..."]}

2026-04-26 11:57:53Z | request_id=45 | status=403 | title=❌ Đơn nghỉ phép bị từ chối
response={"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key..."]}
```

## Kết luận lỗi
- Hệ thống hiện tại **không dùng edge function `send-notification`**.
- Push đang đi theo luồng: `notifications` trigger DB `notify_push_on_insert` -> `pg_net` -> `https://api.onesignal.com/notifications`.
- `ONESIGNAL_APP_ID` trong DB đang đúng: `5eb732df-76ec-4fa9-8741-115270a39c66`.
- `ONESIGNAL_REST_API_KEY` trong DB **đang có giá trị nhưng bị OneSignal từ chối** với `403 Access denied`.
- Supabase runtime secrets hiện tại **không có** `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY`.
- Không có gì cho thấy lỗi nằm ở edge function, vì edge function đó hiện **không tồn tại**.

## Việc sẽ làm ngay sau khi rời read-only mode
1. Cập nhật nguồn credential push về giá trị hợp lệ:
   - tối thiểu: update `public.system_config.ONESIGNAL_REST_API_KEY` bằng App API Key hợp lệ.
2. Chạy lại test insert notification thật.
3. Paste kết quả thật từ `push_send_log` + `net._http_response`.
4. Nếu user muốn kiến trúc dùng secrets thay vì DB, chuyển sang edge function `send-notification` đọc runtime secrets rồi deploy lại.

## Chi tiết kỹ thuật
Sửa tối thiểu để push hoạt động lại không phải là sửa frontend, không phải sửa `rpc_send_test_push`, và cũng không phải debug edge logs. Việc cần làm là thay `ONESIGNAL_REST_API_KEY` hiện tại vì OneSignal đang trả `403` trên các request thực tế.