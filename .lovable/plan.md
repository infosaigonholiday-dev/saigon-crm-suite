## Tình trạng hiện tại

Push đang hỏng ở 2 lớp khác nhau:

1. Edge Function `send-notification` hiện có lỗi build/type-check:
   - `Cannot find module 'npm:web-push@3.6.7'`
   - Nghĩa là bản code hiện tại không còn an toàn để deploy/test tiếp.

2. Dù trigger và luồng gọi function đã tồn tại, database hiện không còn subscription nào:
   - `push_subscriptions` đang rỗng
   - nên dù gọi `send-notification` cũng không có thiết bị nào để nhận push.

3. Logs gần nhất xác nhận lỗi trước đó là `VAPID mismatch`, và function đã xóa stale subscription thành công. Sau bước đó, thiết bị chưa đăng ký lại thành công nên hệ thống đang ở trạng thái “không còn subscriber”.

## Kế hoạch triển khai

### 1. Sửa Edge Function `send-notification` để build ổn định
- Thay import `web-push` hiện tại bằng cách tương thích với runtime Supabase Edge hiện tại.
- Ưu tiên cách ít rủi ro nhất:
  - thêm cấu hình Deno phù hợp cho function, hoặc
  - chuyển sang import/package resolution mà Supabase Edge hỗ trợ ổn định.
- Giữ nguyên logic auth hiện có (`jwt_user`, `service_role`, `x-internal-call`) và logic dọn stale subscription.

### 2. Giữ lại trigger DB hiện tại nhưng rà lại phần logging lỗi
- Không tạo thêm trigger mới nếu `trg_notifications_push` đã có.
- Giữ `notify_push_on_insert()` là điểm gửi push cho mọi notification insert mới.
- Chỉnh phần `EXCEPTION` để log vào `audit_logs` mà không nuốt lỗi hoàn toàn.
- Rà lại migration gần nhất để tránh để lại các biến thể cũ của function gây khó debug.

### 3. Siết lại frontend đăng ký push để user đăng ký lại được thật
- Cập nhật `usePushSubscription.ts` để xử lý rõ hơn các trạng thái:
  - env VAPID thiếu/sai
  - subscription cũ bị xóa ở server
  - browser còn subscription local nhưng DB đã mất
- Đảm bảo `subscribe()` luôn upsert lại `push_subscriptions` kể cả sau khi server đã dọn bản ghi cũ.
- Giữ nút “Đăng ký lại” trong Settings làm đường hồi phục thủ công.

### 4. Hoàn thiện nút test push trong Settings
- Giữ nút “Gửi thử push” hiện có.
- Bổ sung xử lý thông báo lỗi rõ hơn cho 3 trường hợp:
  - function lỗi
  - chưa có subscription
  - push provider từ chối
- Nếu cần, hiển thị hướng dẫn ngắn ngay trong UI khi test trả về `no_subscriptions`.

### 5. Xác minh end-to-end
Sau khi sửa xong sẽ test theo thứ tự:
1. Build/type-check Edge Function hết lỗi.
2. Dùng nút “Gửi thử push” để xác nhận có tạo lại subscription và function trả `sent > 0`.
3. Tạo mới một bản ghi `notifications` để xác nhận trigger DB gọi `send-notification`.
4. Kiểm tra logs của `send-notification` để xác nhận không còn lỗi import/build và xem kết quả gửi thực tế.

## Kết quả mong đợi
- `send-notification` build được và deploy ổn định.
- Thiết bị có thể đăng ký lại subscription mới.
- Nút test push gửi được thông báo thật.
- Notification tạo từ database trigger có thể đi qua cùng một luồng push.

## Chi tiết kỹ thuật
- Files dự kiến chỉnh:
  - `supabase/functions/send-notification/index.ts`
  - có thể thêm cấu hình function-level như `supabase/functions/send-notification/deno.json` nếu cần cho import resolution
  - `src/hooks/usePushSubscription.ts`
  - `src/components/PushNotificationToggle.tsx`
  - một migration mới để dọn logic `notify_push_on_insert()` nếu cần

- Lưu ý quan trọng:
  - Không đổi VAPID keys
  - Không sửa `src/integrations/supabase/types.ts`
  - Không dựa vào localStorage để kiểm tra trạng thái push
  - Không tạo trigger trùng nếu trigger đã tồn tại