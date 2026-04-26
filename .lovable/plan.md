# Plan: Fix Web Push Notification không gửi tới ĐT/Laptop

## 🎯 Root Cause đã xác định
**REST API Key OneSignal đang lưu trong `system_config.ONESIGNAL_REST_API_KEY` bị OneSignal API trả về 403 ở MỌI endpoint, MỌI format header.**

- 19/19 push notification trong 24h vừa qua đều fail với cùng lỗi `403 Access denied`.
- Test trực tiếp `curl` từ sandbox với 3 format header (`Basic`, `Key`, `Bearer`) đều fail → key này không phải REST API Key hợp lệ của app.
- App ID hợp lệ (frontend init OneSignal SDK thành công).

## ✅ Việc cần user làm trước (KHÔNG code được)
**Lấy đúng App API Key (REST API Key) từ OneSignal Dashboard:**

1. Vào https://dashboard.onesignal.com → chọn app có ID `5eb732df-76ec-4fa9-8741-115270a39c66`.
2. Vào **Settings → Keys & IDs**.
3. Tìm mục **"App API Key"** (KHÔNG phải "User Auth Key" hay "Organization API Key").
4. Nếu chưa có key nào → bấm **"Create new key"**, chọn scope **Full Access** (hoặc tối thiểu phải có quyền `notifications:write`).
5. Copy **toàn bộ** chuỗi key (cẩn thận không bị cắt giữa).
6. Gửi key mới cho tôi để cập nhật `system_config`.

## 🛠️ Việc tôi sẽ làm khi có key đúng

### 1. Cập nhật key qua migration
- `UPDATE system_config SET value = '<KEY MỚI>', updated_at = now() WHERE key = 'ONESIGNAL_REST_API_KEY';`
- Nếu Authorization phải là `Key <token>` (OneSignal v16 mới) thay vì `Basic <token>`: sửa lại `notify_push_on_insert()` cho phù hợp. Sẽ test cả 2 format và chọn cái trả về 200/202.

### 2. Test ngay sau khi update
- Insert 1 notification giả vào `notifications` (target user_id của ADMIN).
- Đọc `push_send_log` + `net._http_response` để xác nhận status_code = 200/202.
- Nếu vẫn fail: log chi tiết response trả về để debug tiếp.

### 3. Thêm trang chẩn đoán Push (Settings → Thông báo)
- Thêm 1 button **"Test Push Notification"** trong `PushNotificationToggle.tsx` để admin tự test:
  - Gọi 1 RPC mới `rpc_send_test_push(target_user_id)` insert vào `notifications` rồi đọc lại push_send_log → trả về status 200/4xx/5xx + thông báo cụ thể.
  - Hiển thị cho user "✅ Đã gửi thành công" hoặc "❌ Lỗi: <chi tiết>".
- Hữu ích về sau khi key đổi/hết hạn không cần đợi user phàn nàn.

### 4. Thêm cảnh báo cho admin trong app
- Tạo cron job nhỏ (hoặc check trong AlertsCenter): nếu trong 1h gần nhất có > 5 push fail liên tiếp → hiện banner đỏ trên dashboard "Hệ thống Push Notification đang lỗi, liên hệ admin kiểm tra OneSignal".

### 5. Cập nhật memory
- Ghi lại memory `mem://features/notifications/web-push` về việc:
  - Có 3 loại key trong OneSignal dễ nhầm — chỉ App API Key dùng được cho `/notifications`.
  - Lệnh debug nhanh: `SELECT psl.*, hr.status_code, hr.content FROM push_send_log psl LEFT JOIN net._http_response hr ON hr.id = psl.request_id ORDER BY psl.created_at DESC LIMIT 10;`

## ❓ Câu hỏi cho user trước khi làm
1. **Bạn có truy cập được dashboard OneSignal không?** Nếu chưa, cần thêm tài khoản (https://dashboard.onesignal.com → Settings → Team → Invite).
2. Trong **Settings → Keys & IDs** của app, bạn thấy có sẵn 1 key tên gì không (App API Key đã tạo) hay phải tạo mới?
3. Có muốn tôi luôn thêm nút **"Test Push"** trong giao diện không, hay chỉ fix key là đủ?

## ⚠️ Lưu ý
- KHÔNG đổi App ID (đã đúng).
- KHÔNG đụng vào frontend OneSignal init / Service Worker (đã hoạt động đúng — SDK login user.id thành công).
- Chỉ thay key + có thể tinh chỉnh format `Authorization` header trong trigger.
