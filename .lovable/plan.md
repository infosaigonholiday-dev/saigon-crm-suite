## Mục tiêu
Sửa lỗi hiện tại khi bấm “Gửi thử push” bị báo `Không gọi được send-notification: Failed to send a request to the Edge Function`, rồi kiểm tra lại để tách bạch lỗi gọi function với lỗi gửi push thật.

## Chẩn đoán đã xác nhận
- Screenshot mới cho thấy đây là lỗi ở bước gọi Edge Function, chưa phải lỗi push delivery.
- `src/components/PushNotificationToggle.tsx` gọi `supabase.functions.invoke("send-notification")` đúng pattern.
- Project đang dùng `@supabase/supabase-js` 2.104.1.
- `supabase/functions/send-notification/index.ts` đang khai báo CORS hẹp:
  - chỉ cho `authorization, x-client-info, apikey, content-type`
- Trong cùng project, `manage-employee-accounts` đã cho phép thêm các header mới của Supabase client:
  - `x-supabase-client-platform`
  - `x-supabase-client-platform-version`
  - `x-supabase-client-runtime`
  - `x-supabase-client-runtime-version`
- Với Supabase client hiện tại, thiếu các header này rất dễ gây preflight fail và hiện đúng thông báo “Failed to send a request to the Edge Function”.

## Kế hoạch sửa
1. Cập nhật CORS của `send-notification`.
   - Mở rộng `Access-Control-Allow-Headers` để khớp với các header thực tế mà client gửi.
   - Giữ CORS này ở mọi response, kể cả error response và OPTIONS.

2. Tăng khả năng chẩn đoán ở client.
   - Trong `PushNotificationToggle.tsx`, phân biệt rõ:
     - lỗi không gọi được function
     - function gọi được nhưng `sent=0`
     - function gọi được nhưng push provider trả lỗi
   - Nếu `errors` được trả về từ function, hiện reason ngắn gọn hơn trong toast/log để dễ truy vết.

3. Làm sạch auth/CORS consistency của Edge Function.
   - Giữ cơ chế auth hiện tại, nhưng chuẩn hóa helper response để không có nhánh nào quên CORS headers.
   - Không đổi behavior business logic gửi push ở bước này, chỉ sửa transport layer + observability.

4. Test sau khi triển khai.
   - Test gọi `send-notification` từ UI để xác nhận không còn lỗi “Failed to send a request to the Edge Function”.
   - Nếu request đi qua được, kiểm tra tiếp response thực tế:
     - `no_subscriptions`
     - `sent > 0`
     - `failed > 0` với body lỗi từ push service
   - Khi transport đã ổn, mới đánh giá tiếp bước đăng ký subscription hoặc VAPID mismatch nếu còn.

## File dự kiến chỉnh
- `supabase/functions/send-notification/index.ts`
- `src/components/PushNotificationToggle.tsx`

## Kết quả mong đợi
- Bấm “Gửi thử push” không còn fail ngay ở mức invoke/preflight.
- UI báo đúng là:
  - không gọi được function,
  - chưa có subscription,
  - hay push provider từ chối.
- Nếu còn lỗi sau đó, ta sẽ có message cụ thể hơn để fix tiếp đúng điểm.

## Chi tiết kỹ thuật
- Ưu tiên dùng bộ CORS headers đầy đủ tương thích `supabase-js` mới.
- Có thể giữ dạng manual CORS như các function khác trong project, hoặc chuyển sang `@supabase/supabase-js/cors` nếu runtime/deploy cho phép.
- Không cần thay DB schema ở bước này.
- Đây là fix transport + diagnostics, không phải redesign push flow.