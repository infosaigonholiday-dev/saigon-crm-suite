## Vấn đề hiện tại
Push hiện không còn lệch VAPID giữa client/server nữa. Vấn đề còn lại nằm ở bước **tạo browser subscription**: quyền thông báo đã là `granted`, nhưng `pushManager.subscribe()` vẫn trả về `Registration failed - permission denied`.

Từ code hiện tại và ảnh lỗi, đây là lỗi rất hay xảy ra khi rơi vào một trong các trạng thái sau:
- subscribe đang chạy trong context bị browser chặn (iframe / preview / không phải top-level tab)
- service worker registration chưa được dùng theo một luồng ổn định
- app đang có 2 luồng SW/push UI khác nhau nên trải nghiệm recovery chưa nhất quán

## Kế hoạch triển khai
1. **Chuẩn hóa luồng Service Worker + Push trong `usePushSubscription.ts`**
   - Tạo một helper duy nhất để:
     - đăng ký `/sw.js` với scope ổn định
     - chờ registration active/ready thật sự
     - luôn lấy cùng một registration để check, subscribe, unsubscribe
   - Bỏ các nhánh dễ gây trạng thái mơ hồ khi vừa register vừa subscribe.
   - Phân loại lỗi rõ hơn cho `NotAllowedError`/`permission denied` để biết là do iframe, browser block, hay registration chưa sẵn sàng.

2. **Loại bỏ race condition do đăng ký SW ở nhiều chỗ**
   - Rà lại `src/main.tsx` và hook để chỉ còn **một chiến lược đăng ký** nhất quán.
   - Nếu giữ đăng ký sớm ở `main.tsx`, hook sẽ chỉ tái sử dụng registration đó.
   - Nếu chuyển toàn bộ vào hook, sẽ bỏ đăng ký trùng để tránh browser state khó đoán.

3. **Đồng bộ UI chẩn đoán push**
   - Giữ `PushNotificationToggle` làm UI chuẩn vì đang có status/debug tốt hơn.
   - Cập nhật `PushNotificationCard` hoặc thay bằng shared UI để không còn 2 hành vi khác nhau giữa trang Hồ sơ và Cài đặt.
   - Hiển thị rõ khi nào phải mở app ở tab thật thay vì preview/login iframe.

4. **Kiểm tra lại server-side path chỉ sau khi client subscribe thành công**
   - Xác minh `send-notification` vẫn dùng đúng fingerprint hiện tại.
   - Nếu cần, redeploy lại function sau chỉnh sửa client để chắc log/runtime đồng bộ.
   - Chỉ purge subscription thêm lần nữa nếu log cho thấy vẫn còn record stale mới.

5. **Test thực tế sau khi sửa**
   - Mở app ở **tab thật / domain thật**, đăng nhập, vào `Cài đặt → Thông báo`.
   - Bật push và xác nhận `push_subscriptions` có bản ghi mới.
   - Bấm `Gửi thử push` và kiểm tra kết quả thực tế + edge function logs.

## File dự kiến cập nhật
- `src/hooks/usePushSubscription.ts`
- `src/main.tsx`
- `src/components/PushNotificationToggle.tsx`
- `src/components/PushNotificationCard.tsx`
- Có thể kiểm tra lại `supabase/functions/send-notification/index.ts` nếu cần xác minh log/redeploy

## Chi tiết kỹ thuật
- Hiện frontend đã đọc `VITE_VAPID_PUBLIC_KEY` từ env, nên trọng tâm không còn là key mismatch mà là lifecycle của subscription.
- `Notification.permission = granted` nhưng `subscribe()` vẫn fail thường không phải lỗi DB; nó là lỗi browser/service worker context.
- Ảnh lỗi không cho thấy lỗi insert DB; trạng thái hiện dừng trước bước upsert `push_subscriptions`.
- Việc test trong preview/login iframe không đủ tin cậy cho Web Push; cần test ở top-level tab sau khi sửa.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
  <lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>