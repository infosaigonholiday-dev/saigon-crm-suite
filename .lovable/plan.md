## Root cause

Tôi đã đào trace toàn bộ pipeline gửi broadcast:

| Layer | Trạng thái |
|---|---|
| **Edge function `broadcast-notification`** chạy được — `curl` test trả `401 "Thiếu token"` đúng. |
| **Edge function logs** hiện chỉ có Boot/Shutdown — không có log execution gần đây trùng với lúc user nhấn Gửi → có nghĩa lỗi xảy ra ở `send-notification` (cũ, được trigger gọi qua `pg_net` từ `trg_notifications_push`) HOẶC ở chính `broadcast-notification` nhưng đã shutdown trước khi log flush, HOẶC Promise reject trước khi tới `Deno.serve`. |
| **Constraint `chk_action_url_required`** bắt action_url phải hợp lệ với high/critical — đã có guard ở edge function. |
| **Trigger `trg_notifications_push` → `notify_push_on_insert`** đã wrap exception nên không rollback. |
| **`broadcast_messages.priority`** default `'normal'` — không có CHECK, OK. |

→ Lỗi non-2xx user thấy nhiều khả năng là do **`send-notification` (gọi qua trigger) trả 4xx khi user chưa subscribed** hoặc khi OneSignal trả lỗi, **cộng với việc UI hiện hiển thị toast generic** "non-2xx status" thay vì parse `data.error` chi tiết.

## Fix theo đúng spec (3 file + 1 migration)

### 1. Migration mới: `notification_delivery_logs`
Tạo bảng tracking từng push:
- `id`, `notification_id` (FK → notifications, ON DELETE CASCADE)
- `user_id`, `channel` (in_app/push/email/sms), `status` (queued/sent/failed/not_subscribed/push_failed/skipped)
- `provider` (vd onesignal), `provider_response` jsonb, `error_message`, `created_at`
- RLS: chủ user thấy log của mình; ADMIN/SUPER_ADMIN/HR_MANAGER thấy toàn bộ; service_role insert (bypass RLS).

### 2. `supabase/functions/broadcast-notification/index.ts` — refactor toàn bộ
**Quy tắc 4 bước:**

```
[1] Validate quyền + payload → trả 4xx CỤ THỂ (mỗi case có code + error message rõ)
    Codes: AUTH_MISSING / AUTH_INVALID / FORBIDDEN_ROLE / MISSING_TITLE
           MISSING_MESSAGE / NO_RECIPIENTS / INVALID_PRIORITY 
           URL_REQUIRED_FOR_HIGH_PRIORITY / NO_ALLOWED_RECIPIENTS / ...

[2] Insert broadcast_messages (history)

[3] Bulk insert notifications cho TẤT CẢ allowedIds (CRITICAL — phải xong trước push)
    → Nếu fail: trả 500 với code NOTIFICATION_INSERT_FAILED + broadcast_id

[4] Best-effort push qua send-notification cho từng user (Promise.allSettled):
    - Parse OneSignal response → phân loại: sent / not_subscribed / push_failed
    - Ghi notification_delivery_logs (try/catch nếu bảng chưa tồn tại)
    - PUSH FAIL KHÔNG ROLLBACK NOTIFICATION DB

Trả về:
{ ok:true, sent_count, push:{sent,not_subscribed,failed,errors[]},
  summary:"Đã tạo X thông báo trong hệ thống. Push: A thành công, B chưa bật, C lỗi." }
```

Bổ sung `SUPER_ADMIN` và `HR_MANAGER` vào `ALLOWED_SENDER_ROLES` (UI đã cho phép nhưng edge function thì chưa — đây có thể chính là nguồn lỗi 403 nếu user là SUPER_ADMIN/HR_MANAGER).

### 3. `src/pages/BroadcastNotification.tsx` — parse error chi tiết
Sửa `sendMutation`:
- Pre-check: nếu `recipientIds.length === 0` → toast "Vui lòng chọn người nhận" và **không gọi edge function**.
- Khi `error` từ `supabase.functions.invoke`: gọi `error.context.json()` để lấy body chi tiết (`code`, `error`, `summary`).
- Map `code` → toast tiếng Việt rõ ràng:
  - `AUTH_*` / `FORBIDDEN_ROLE` → "Bạn không có quyền gửi thông báo"
  - `NO_RECIPIENTS` / `NO_ALLOWED_RECIPIENTS` → "Không có người nhận hợp lệ"
  - `URL_REQUIRED_FOR_HIGH_PRIORITY` → "Thông báo Cao/Khẩn cần URL điều hướng hợp lệ"
  - `NOTIFICATION_INSERT_FAILED` → "Tạo thông báo thất bại: <chi tiết>"
  - default → message từ server
- `onSuccess`: hiển thị `data.summary` thay vì chỉ `sent_count`. Nếu `data.push.failed > 0` → `toast.warning` thay vì `toast.success`.

### 4. (Không đổi) `send-notification`
Đã hoạt động đúng — chỉ trả lỗi đúng status code OneSignal. Giữ nguyên.

## Test nghiệm thu (sau khi deploy)

| Case | Mong đợi |
|---|---|
| Gửi 0 người | UI báo "Vui lòng chọn người nhận", **không** gọi edge function |
| Gửi 1 người chưa bật push | DB có 1 notification + 1 row `notification_delivery_logs(status=not_subscribed)`. Toast: "Đã tạo 1 thông báo. Push: 0 thành công, 1 chưa bật, 0 lỗi." |
| Gửi 1 người đã bật push | DB có 1 notification + 1 row `status=sent`. Toast: "Đã tạo 1. Push: 1 thành công." |
| Gửi với priority=high, url="/" | UI/edge từ chối với code URL_REQUIRED_FOR_HIGH_PRIORITY |
| OneSignal API down | Vẫn tạo notifications. Toast: "Push: 0 thành công, 0 chưa bật, N lỗi." |

## Files thay đổi
- **Migration mới**: `supabase/migrations/<timestamp>_notification_delivery_logs.sql`
- `supabase/functions/broadcast-notification/index.ts` (rewrite)
- `src/pages/BroadcastNotification.tsx` (sửa sendMutation + onSuccess + onError)

## Ngoài phạm vi
- Không đụng `send-notification` (đang OK)
- Không đụng trigger `trg_notifications_push` (vẫn dùng được khi insert trực tiếp từ business code khác)
- Không đụng RLS `notifications`
