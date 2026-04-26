## Việc làm ngay sau khi approve

### 1. Update `public.system_config`
```sql
UPDATE public.system_config
SET value = 'os_v2_app_numioy5i2zamhnochiokt5p2j6cvzmx3p7rutvngrivo4yjxyzyautvpkrcugiv23rvcpzfw2cmrgkmu2em5vjb6wvdynxelfuop6ki',
    updated_at = now()
WHERE key = 'ONESIGNAL_REST_API_KEY';
```

### 2. Lưu vào Supabase Edge Secrets
- `ONESIGNAL_REST_API_KEY` = key mới
- `ONESIGNAL_APP_ID` = `5eb732df-76ec-4fa9-8741-115270a39c66`
(để dùng được cả ở edge function nếu sau này chuyển sang gọi qua edge thay vì DB trigger).

### 3. Verify SQL update
```sql
SELECT key, LEFT(value, 30) || '...' AS preview, updated_at 
FROM public.system_config 
WHERE key IN ('ONESIGNAL_APP_ID','ONESIGNAL_REST_API_KEY');
```

### 4. Test thật bằng `rpc_send_test_push()`
Gọi RPC để hệ thống tự INSERT notification → trigger `notify_push_on_insert` → `pg_net` → OneSignal, rồi đọc lại `net._http_response`.

```sql
SELECT public.rpc_send_test_push();
```

Mong đợi: `status_code = 200` và `id` trả về từ OneSignal.

### 5. Đọc 3 dòng `push_send_log` mới nhất + response thật
```sql
SELECT l.created_at, l.title, l.request_id, r.status_code, LEFT(r.content::text, 300) AS body
FROM public.push_send_log l
LEFT JOIN net._http_response r ON r.id = l.request_id
ORDER BY l.created_at DESC LIMIT 3;
```

### 6. Báo kết quả thật cho user
- Paste `status_code` thật (200 / 400 / 403…)
- Paste body response thật từ OneSignal
- Nếu 200 nhưng "All included players are not subscribed" → user phải bấm "Bật thông báo" trong app trước rồi test lại (đây là vấn đề subscribe thiết bị, không phải key).
- Nếu 200 và có recipient → push sẽ hiện trên thiết bị đã subscribe. User cần xác nhận trên điện thoại/máy tính.

### Không làm
- Không sửa frontend.
- Không sửa trigger `notify_push_on_insert` (đã đúng logic `Key ` cho `os_v2_*`).
- Không tạo bảng/edge function mới.
