## Mục tiêu
Khôi phục lại nút “Gửi thử push” và làm rõ vì sao hiện tại người dùng thấy “không được”, thay vì ẩn nút theo trạng thái nội bộ khó hiểu.

## Những gì đang xảy ra
- `PushNotificationToggle` hiện chỉ hiển thị nút `Gửi thử push` khi `isSubscribed === true`.
- `isSubscribed` được quyết định bởi `usePushSubscription()` sau khi kiểm tra Service Worker + subscription trình duyệt + bản ghi trong `push_subscriptions`.
- Log Edge Function gần nhất cho thấy subscription cũ đã bị xóa vì `VAPID mismatch`, nên UI rất dễ rơi về trạng thái “không subscribed” và làm nút test biến mất.
- Người dùng hiện đang ở `/login` trong preview, nên ngay cả khi preview mở được, cũng không thể xác nhận push flow cho user chưa đăng nhập.

## Kế hoạch sửa
1. Cập nhật `PushNotificationToggle` để không ẩn hoàn toàn phần test push theo `isSubscribed` nữa.
   - Luôn hiển thị khu vực chẩn đoán trạng thái.
   - Nếu chưa subscribed: hiện nút/CTA rõ ràng như `Bật thông báo` hoặc `Đăng ký lại` thay vì biến mất.
   - Nếu đang ở iframe: vẫn hiện lý do bị chặn + nút `Mở tab mới`.

2. Cập nhật `usePushSubscription` để trả thêm trạng thái chẩn đoán rõ ràng.
   - Ví dụ: `hasBrowserSubscription`, `hasDbSubscription`, `statusReason`.
   - Phân biệt các trường hợp:
     - trình duyệt chưa cấp quyền
     - có subscription trong browser nhưng mất row DB
     - DB bị cleanup do VAPID mismatch
     - đang chạy trong iframe
     - thiếu `VITE_VAPID_PUBLIC_KEY`

3. Điều chỉnh logic UI thông báo lỗi/hướng dẫn.
   - Khi chưa subscribed: hiện đúng nguyên nhân và action tương ứng.
   - Khi test thất bại: giữ nút test hiển thị, không phụ thuộc vào toggle bị reset.
   - Thêm copy tiếng Việt rõ ràng để người dùng biết cần làm gì tiếp theo.

4. Kiểm tra lại đường đi hiện tại trong app.
   - Xác nhận `PushNotificationToggle` đang được render ở cả `Settings > Thông báo` và cuối `SettingsAccountsTab`.
   - Loại bỏ khả năng user vào nhầm chỗ nhưng tưởng tính năng bị mất.

## Kết quả mong đợi
- Nút test không còn “mất mẹ luôn” chỉ vì `isSubscribed` tụt về false.
- UI luôn cho thấy trạng thái hiện tại của push và bước tiếp theo cần làm.
- Sau khi user đăng nhập ở tab thật, có thể bật lại subscription và test lại dễ hơn.

## Chi tiết kỹ thuật
- File dự kiến chỉnh:
  - `src/components/PushNotificationToggle.tsx`
  - `src/hooks/usePushSubscription.ts`
- Hướng triển khai:
  - đổi từ conditional render `isSubscribed && ...` sang render theo state machine nhẹ
  - thêm reason enums / derived flags trong hook
  - nếu thiếu env VAPID, ném lỗi rõ ràng hoặc surface thành trạng thái lỗi cố định ở UI
- Không cần đổi DB cho bước này; đây là fix UX + chẩn đoán phía client để người dùng không bị mù trạng thái.