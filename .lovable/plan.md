# 🔍 Chẩn đoán thực tế từ database

Đã query `push_send_log` + `net._http_response`:
- **9/9 push gần nhất đều fail với HTTP 403**
- Response: `"Access denied. Please include an 'Authorization: ...' header with a valid API key"`
- Cả push từ đơn nghỉ phép, từ rpc test, đều cùng lỗi
- Key trong DB: `os_v2_app_l23tfx3w5rh2tb2bcfjh...` (app-level v2 key, length 113)

**Kết luận**: Migration trước đoán sai. App-level key `os_v2_app_*` **KHÔNG** dùng `Basic` — phải dùng `Key`.

## ✅ Đáp đúng theo OneSignal v16 docs (đã verify):

| Key prefix | Header đúng |
|---|---|
| Legacy (no prefix, ngắn ~48 ký tự) | `Authorization: Basic <key>` |
| **`os_v2_app_*`** | **`Authorization: Key <key>`** |
| `os_v2_org_*` | `Authorization: Key <key>` |

→ **Mọi key bắt đầu bằng `os_v2_` đều dùng `Key`**. Chỉ legacy key (no prefix) mới dùng `Basic`.

# 🛠️ Việc cần làm

## 1. Migration: sửa lại `notify_push_on_insert()`
Đảo logic header — mọi `os_v2_*` (app hay org) đều dùng `Key`:

```sql
IF v_rest_key LIKE 'os_v2_%' THEN
  v_auth_header := 'Key ' || v_rest_key;       -- v2 keys (app + org)
ELSE
  v_auth_header := 'Basic ' || v_rest_key;     -- legacy keys
END IF;
```

## 2. Verify ngay sau migration
- Query `net._http_response` để xác nhận status `200` thay vì `403`
- Nếu vẫn 403 → key thực sự bị sai/revoke → user phải tạo key mới trên dashboard

## 3. Audit edge function (đã check)
- `supabase/functions/` chỉ có: `auth-email-hook`, `daily-reminders`, `manage-employee-accounts`
- **Không có** `send-notification` — toàn bộ push do trigger DB gọi trực tiếp
- `daily-reminders` chỉ INSERT vào `notifications` → trigger sẽ tự gọi → fix DB là đủ

## 4. Test thực tế
1. Vào **Cài đặt → Thông báo → "Gửi thử push"**
2. Đợi 2-3 giây — sẽ thấy toast với status code thật từ OneSignal
3. Mong đợi: `✅ status_code: 200` + thông báo bật ra trên thiết bị (chuyển tab khác để OS hiện)
4. Nếu OK → tạo 1 đơn nghỉ phép thử để verify push từ trigger thực tế

# ❓ Tại sao welcome notification vẫn chạy?
Welcome notification do **OneSignal SDK browser** tự gửi nội bộ (không qua REST API của bạn) → không cần auth header → vẫn chạy bình thường.
Còn mọi push hệ thống (mention, leave, expense...) đều phải qua REST API → bị 403 = không bao giờ tới device.

# 📦 Output sau khi user duyệt
- 1 migration SQL sửa hàm `notify_push_on_insert()`
- 1 lần query verify status code mới
- Hướng dẫn user bấm "Gửi thử push" để xác nhận
