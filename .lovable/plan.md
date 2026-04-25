## Mục tiêu
Khôi phục thông báo đẩy để khi có notification mới thì thiết bị nhận được thật, đặc biệt trên điện thoại.

## Kết luận đã xác nhận
- Client hiện đăng ký subscription được: DB đang có 1 bản ghi mới cho user admin, endpoint là `https://web.push.apple.com/...`.
- Nghĩa là phần frontend `serviceWorker + pushManager.subscribe + lưu push_subscriptions` đang hoạt động.
- Điểm nghẽn hiện tại nằm ở khâu gửi push tự động:
  - Trigger DB `notify_push_on_insert()` gọi Edge Function `send-notification` bằng `Authorization: Bearer <anon key>`.
  - Nhưng `send-notification` hiện chỉ chấp nhận `service role` hoặc JWT user hợp lệ.
  - Test trực tiếp trả `401 Unauthorized`, và analytics cũng ghi nhận `POST /send-notification -> 401`.
- Ngoài ra app chưa có cấu hình PWA/iOS đầy đủ trong `index.html` (chưa thấy manifest / apple mobile tags), nên iPhone rất dễ subscribe không ổn định hoặc không hiện push theo đúng cơ chế Home Screen app.

## Kế hoạch sửa
1. Sửa xác thực của `send-notification`
- Cho phép lời gọi nội bộ từ database trigger một cách an toàn.
- Cách an toàn nhất: hỗ trợ thêm `anon key` chỉ cho đường gọi DB trigger, nhưng bắt buộc validate body chặt và chỉ dùng để gửi tới `user_id` có subscription trong hệ thống.
- Đồng thời giữ nguyên luồng JWT user cho nút “Gửi thử push” và service role cho edge functions khác.

2. Sửa trigger gửi push từ DB
- Cập nhật `notify_push_on_insert()` để dùng cơ chế gọi tương thích với `send-notification` sau khi chỉnh auth.
- Giữ fallback ghi `audit_logs` khi push fail để lần sau dễ debug hơn.
- Rà lại mapping URL entity để push mở đúng màn hình trên app.

3. Bổ sung cấu hình PWA tối thiểu cho mobile/iPhone
- Thêm `manifest.webmanifest`.
- Thêm các thẻ cần thiết trong `index.html`: `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, icon links.
- Dùng brand Saigon Holiday hiện có cho icon/manifest nếu đã có asset phù hợp; nếu chưa có thì tạo placeholder brand-safe.

4. Cải thiện UI hướng dẫn bật push trên điện thoại
- Trong `PushNotificationToggle`, hiển thị hướng dẫn rõ hơn cho iPhone:
  - phải mở bằng domain thật `app.saigonholiday.vn`
  - phải Add to Home Screen
  - phải bật từ icon app ngoài màn hình chính, không bật trong tab preview/editor
- Phân biệt rõ các trạng thái: unsupported, iframe, denied, subscribed nhưng chưa test.

5. Bổ sung log/khả năng chẩn đoán nhanh
- Thêm log rõ ràng trong `send-notification` cho 3 trường hợp: unauthorized, no_subscriptions, sent/failed.
- Nếu provider Apple trả lỗi cụ thể, log status/body để biết là lỗi device token, permission hay endpoint stale.

6. Xác minh end-to-end sau khi sửa
- Tạo notification mới trong DB path thực tế.
- Kiểm tra function logs có request 200 thay vì 401.
- Kiểm tra `push_subscriptions.last_used_at` được cập nhật.
- Test trên iPhone/PWA hoặc thiết bị đang subscribe để xác nhận banner push hiện thật ngoài màn hình.

## Technical details
```text
Current broken flow:
notifications INSERT
  -> DB trigger notify_push_on_insert()
  -> call /functions/v1/send-notification with anon key
  -> send-notification rejects with 401
  -> no push sent

Target flow:
notifications INSERT
  -> DB trigger notify_push_on_insert()
  -> authenticated internal call accepted
  -> send-notification loads user subscriptions
  -> web-push sends to Apple/FCM endpoint
  -> update last_used_at / cleanup stale subs
```

## File dự kiến ảnh hưởng
- `supabase/functions/send-notification/index.ts`
- `supabase/migrations/...` (update function `notify_push_on_insert` nếu cần)
- `index.html`
- `public/manifest.webmanifest` và icon liên quan
- `src/components/PushNotificationToggle.tsx`
- Có thể thêm/điều chỉnh memory cho web push nếu logic thay đổi

## Kỳ vọng sau khi xong
- Notification mới sinh ra từ hệ thống sẽ không còn rơi vào im lặng.
- Nút “Gửi thử push” và trigger tự động cùng dùng được.
- iPhone có quy trình bật push rõ ràng và đúng chuẩn PWA.