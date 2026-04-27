## 🔴 Nguyên nhân thực sự

Sau khi audit toàn bộ:

| Kiểm tra | Kết quả |
|---|---|
| `notifications` count | 71 records (bình thường) |
| `push_send_log` count | 50 records (bình thường) |
| Notif tạo hôm nay | 10 (bình thường) |
| Index `idx_profiles_role`, `idx_profiles_role_active` | ✅ ĐÃ CÓ |
| Index `idx_notif_dedup`, `idx_notif_unread_age` | ✅ ĐÃ CÓ |
| Index `idx_push_send_log_notification` | ✅ ĐÃ CÓ |
| 4 trigger mới (estimate/settlement/lead/employee) | OK, query có index |

**→ Indexes KHÔNG thiếu. 8 loại notification mới KHÔNG gây bùng nổ. Chẩn đoán "thiếu index" trong câu hỏi là sai hướng.**

**Lỗi thật**: `rpc_send_test_push` chứa block:

```sql
WHILE v_attempts < 60 LOOP   -- 60 vòng × 0.5s = 30 giây
  SELECT ... FROM net._http_response WHERE id = v_log.request_id;
  IF v_status_code IS NOT NULL THEN EXIT; END IF;
  PERFORM pg_sleep(0.5);
  v_attempts := v_attempts + 1;
END LOOP;
```

Supabase PostgREST set `statement_timeout = 8s` cho role `authenticated`. Hàm này poll tối đa 30s → **luôn bị kill** với lỗi `canceling statement due to statement timeout` nếu OneSignal trả về chậm hơn 8s (gần như luôn xảy ra với pg_net async).

## ✅ Cách fix (1 migration duy nhất)

Viết lại `rpc_send_test_push` để:
1. INSERT notification → trigger `notify_push_on_insert` chạy → push_send_log tạo ngay (sync)
2. Trả về **request_id + log info NGAY LẬP TỨC** (không poll). Tổng thời gian < 1s, không bao giờ timeout.
3. Frontend sẽ tự poll bảng `push_send_log` qua một RPC nhẹ thứ 2 (`rpc_check_push_status(request_id bigint)`) — mỗi call chỉ 1 SELECT, < 100ms.

### Migration SQL

```sql
-- 1) Rewrite RPC: bỏ vòng lặp pg_sleep, trả về ngay
CREATE OR REPLACE FUNCTION public.rpc_send_test_push()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, net AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_notif_id uuid;
  v_log record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO notifications (user_id, type, title, message, entity_type, priority, is_read)
  VALUES (v_user_id, 'TEST_PUSH', '🔔 Test push từ Saigon Holiday CRM',
          'Nếu thấy thông báo này trên thiết bị (ngoài tab app), push đã hoạt động!',
          'system', 'normal', false)
  RETURNING id INTO v_notif_id;

  SELECT * INTO v_log FROM push_send_log WHERE notification_id = v_notif_id LIMIT 1;

  RETURN jsonb_build_object(
    'ok', v_log.error IS NULL AND v_log.request_id IS NOT NULL,
    'notification_id', v_notif_id,
    'request_id', v_log.request_id,
    'error', v_log.error,
    'hint', 'Push đã được gửi async. Dùng rpc_check_push_status(request_id) để xem kết quả OneSignal sau 2-5s.'
  );
END $$;

-- 2) RPC mới để frontend poll trạng thái (cực nhẹ)
CREATE OR REPLACE FUNCTION public.rpc_check_push_status(p_request_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, net AS $$
DECLARE
  v_status int;
  v_body text;
BEGIN
  SELECT status_code, content::text INTO v_status, v_body
  FROM net._http_response WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'ready', v_status IS NOT NULL,
    'status_code', v_status,
    'response', LEFT(COALESCE(v_body,''), 500),
    'hint', CASE
      WHEN v_status IS NULL THEN 'Chưa có response — chờ thêm 1-2s'
      WHEN v_status = 403 THEN '⚠️ REST API Key SAI'
      WHEN v_status = 400 AND v_body LIKE '%not subscribed%' THEN '✅ Key OK — tài khoản chưa subscribe push trên thiết bị nào'
      WHEN v_status BETWEEN 200 AND 299 THEN '✅ OneSignal nhận push OK'
      ELSE 'Lỗi: copy response gửi admin'
    END
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rpc_send_test_push() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_check_push_status(bigint) TO authenticated;
```

### Cập nhật frontend `PushNotificationToggle.tsx`

Trong `handleTestPush`:
1. Gọi `rpc_send_test_push` → nhận `request_id` ngay (< 1s)
2. Chạy loop client-side: mỗi 1.5s gọi `rpc_check_push_status(request_id)`, tối đa 10 lần (15s)
3. Khi `ready=true` → hiển thị toast theo `status_code`
4. Nếu hết 15s vẫn chưa ready → toast warning "OneSignal chưa phản hồi, kiểm tra Delivery log"

## Phạm vi

- **Migration 1 file**: rewrite `rpc_send_test_push` + thêm `rpc_check_push_status`
- **Edit 1 file frontend**: `src/components/PushNotificationToggle.tsx` — phần `handleTestPush`
- KHÔNG đụng vào trigger `notify_push_on_insert` (đã hoạt động đúng)
- KHÔNG đụng vào 4 trigger thông báo mới (đã verified hoạt động qua push_send_log)
- KHÔNG thêm index (đã đủ)

## Verify sau khi xong

1. Bấm "Gửi thử push" trên `/canh-bao` → KHÔNG còn statement timeout
2. Toast hiện: "Đã gửi, đang chờ OneSignal..." → 2-5s sau cập nhật kết quả thật
3. Nếu thiết bị đã subscribe → notification xuất hiện trên màn hình
