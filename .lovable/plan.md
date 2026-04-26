## Kết luận kiểm tra lại từ đầu đến cuối

Hiện tại mình xác nhận được 3 điều:

- Service worker mới đã có: `public/OneSignalSDKWorker.js` tồn tại và đang được serve đúng tại `https://app.saigonholiday.vn/OneSignalSDKWorker.js`.
- Luồng OneSignal mới đã có mặt trong app: `index.html` nạp SDK v16, `src/main.tsx` gọi `OneSignal.init(...)`, `AuthContext.tsx` map user vào `external_id`, và DB trigger `notify_push_on_insert()` đang dùng `Authorization: Basic`.
- Nhưng hệ thống vẫn chưa “sạch hoàn toàn” và vẫn còn rủi ro lỗi do tàn dư bản cũ.

## Vấn đề còn tồn tại

1. Legacy chưa xóa hết
- Bảng `public.push_subscriptions` vẫn còn tồn tại và hiện còn 4 dòng dữ liệu cũ.
- `src/integrations/supabase/types.ts` vẫn còn type cho `push_subscriptions`.
- Trong repo vẫn còn nhiều migration lịch sử nhắc tới `send-notification`/VAPID (không chạy nữa, nhưng gây nhiễu khi audit).

2. Trình duyệt có khả năng vẫn đang dùng client/SW cũ
- Ảnh chụp của bạn hiển thị các chuỗi như `Gửi thử push`, `Đăng ký lại`, `send-notification`, `VAPID`.
- Các chuỗi này không còn tồn tại trong code hiện tại nữa.
- Điều đó cho thấy ít nhất một browser/device vẫn đang giữ bundle hoặc service worker cũ trong cache.

3. Khả năng quan sát lỗi backend còn yếu
- `notify_push_on_insert()` hiện gọi `net.http_post(...)` nhưng không lưu request id/response để dò lỗi OneSignal 4xx/5xx.
- Vì vậy có thể gặp lỗi thật mà app không log rõ ràng trong `audit_logs`.
- Trong `net._http_response` hiện chỉ thấy response cũ của luồng `send-notification` trước đó (`reason: no_subscriptions`), chưa có đủ dấu vết để xác nhận một lần gửi OneSignal mới thành công end-to-end sau migration.

## Plan sửa triệt để

### 1) Dọn sạch tàn dư bản cũ
- Tạo migration dọn legacy push:
  - xóa/rename/archive bảng `push_subscriptions`
  - ghi chú rõ OneSignal là luồng duy nhất
- Regenerate hoặc cập nhật Supabase types để bỏ `push_subscriptions` khỏi client types.
- Rà lại UI/help text nếu còn chỗ nào nhắc VAPID, `send-notification`, “DB row”, “Đăng ký lại”.

### 2) Thêm cleanup phía trình duyệt
- Trong `src/main.tsx`, thêm bước cleanup một lần để unregister service worker cũ kiểu VAPID (`/sw.js` hoặc registration cũ nếu có).
- Khai báo explicit `serviceWorkerPath: "/OneSignalSDKWorker.js"` khi init OneSignal để tránh lệ thuộc default behavior.
- Nếu phát hiện đang chạy trong context cũ, hiển thị hướng dẫn rõ: refresh mạnh / clear site data / mở tab thật.

### 3) Tăng khả năng debug luồng OneSignal
- Cập nhật `notify_push_on_insert()` để lưu request id từ `net.http_post(...)` vào `audit_logs` hoặc metadata debug.
- Thêm cách tra cứu rõ giữa `notification.id` và `net._http_response` để biết request nào trả 200/400/401.
- Nếu cần, thêm logging nhẹ ở client cho trạng thái init/login/subscription của OneSignal.

### 4) Xác minh end-to-end sau cleanup
- Test trên domain thật `https://app.saigonholiday.vn` trong tab riêng.
- Clear site data/browser cache trước khi test.
- Đăng nhập lại, bật push, xác nhận subscription xuất hiện trong OneSignal Audience với đúng `external_id = user.id`.
- Tạo 1 notification thật (ví dụ @mention hoặc leave request), rồi kiểm tra:
  - notification row được insert
  - request OneSignal được queue
  - response không còn là luồng `send-notification` cũ
  - máy nhận được push thật

## Technical details

```text
Current intended flow
Browser -> OneSignal SDK v16 -> OneSignal subscription
AuthContext -> OneSignal.login(user.id as external_id)
notifications INSERT -> DB trigger notify_push_on_insert()
DB trigger -> net.http_post() -> OneSignal Notifications API
OneSignal -> push to subscribed browser for that external_id
```

Các file chính sẽ chỉnh khi triển khai:
- `src/main.tsx`
- `src/hooks/useOneSignal.ts` (nếu cần tăng debug/state)
- `src/components/PushNotificationToggle.tsx` (nếu cần copy/hướng dẫn cleanup)
- `src/integrations/supabase/types.ts`
- `supabase/migrations/...` (cleanup legacy + improve DB observability)

Mục tiêu của lần sửa này là: không chỉ “có vẻ đúng”, mà phải dọn sạch bản cũ, loại cache/SW cũ, và làm cho mọi lỗi OneSignal về sau đều truy ra được.