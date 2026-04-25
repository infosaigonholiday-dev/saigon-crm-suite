
# Plan: Hệ thống cảnh báo nâng cao (Lớp 1+2+3+6)

## Lớp 1 — Schema + Trigger leave_requests (Migration)

**1.1 Mở rộng `notifications`:**
- Thêm cột: `read_at TIMESTAMPTZ`, `escalation_level SMALLINT DEFAULT 0`, `escalated_at TIMESTAMPTZ`, `priority TEXT DEFAULT 'normal'` (low/normal/high/critical)
- Index: `idx_notif_unread_age (user_id, is_read, created_at) WHERE is_read=false`, `idx_notif_dedup (user_id, entity_id, type, created_at)`

**1.2 Trigger auto `read_at`:**
- Function `set_notification_read_at()` BEFORE UPDATE: nếu `is_read` chuyển false→true thì set `read_at = now()`

**1.3 Trigger `leave_requests`:**
- Kiểm tra schema bảng `leave_requests` thực tế trước khi viết
- Function `notify_leave_request_change()`:
  - INSERT: insert notifications cho HR_MANAGER + HCNS + ADMIN + MANAGER cùng `department_id` với người tạo đơn (priority=high)
  - UPDATE status (APPROVED/REJECTED): notify chính người tạo đơn
  - Dùng `pg_net.http_post` gọi `send-notification` để fire web push ngay

## Lớp 2 — Escalation Lv1 (`daily-reminders`)

Block mới đầu function:
- Query notifications WHERE `is_read=false` AND `escalation_level=0` AND `created_at < now()-3d`
- Group by user_id, đếm số noti tồn đọng
- Tìm Manager/GDKD cùng `department_id` của staff
- Insert 1 noti gộp cho Manager: *"⚠️ {staff_name} có {N} cảnh báo chưa đọc quá 3 ngày"*
- UPDATE batch: set `escalation_level=1`, `escalated_at=now()` cho noti gốc
- Bắn web push qua `sendPush` helper

## Lớp 3 — Mở rộng deadline alerts (`daily-reminders`)

Thêm 6 block (verify schema cột trước khi query):

| # | Loại | Điều kiện | Người nhận | Type | Priority |
|---|------|-----------|------------|------|----------|
| 3.1 | Booking khởi hành | T-7, T-3, T-1 | sale + Manager + DIEUHAN | BOOKING_DEPARTURE_NEAR | high (T-1=critical) |
| 3.2 | Hạn thanh toán | deposit_due_at/remaining_due_at ≤ today+3 | sale + KETOAN | PAYMENT_DUE | high |
| 3.3 | Contract chờ duyệt | status=DRAFT >2 ngày | GDKD + MANAGER + DIEUHAN | CONTRACT_APPROVAL_OVERDUE | normal |
| 3.4 | Quotation không phản hồi | status=SENT >5 ngày | sale | QUOTATION_NO_RESPONSE | normal |
| 3.5 | Sinh nhật nhân viên | date_of_birth=today | HR_MANAGER + HCNS + Manager dept | EMPLOYEE_BIRTHDAY | normal |
| 3.6 | HĐLĐ sắp hết hạn | T-30, T-7 (nếu cột tồn tại) | HR_MANAGER + HCNS + ADMIN | EMPLOYEE_CONTRACT_EXPIRING | high |

Mỗi insert thành công → fire push qua `sendPush`. Dedup theo (user_id, entity_id, type, created_at hôm nay).

**Cập nhật `NotificationBell.tsx`:**
- Import icons: Plane, CreditCard, FileSignature, FileText, Cake, UserX
- Mở rộng `typeIcons` map cho 6 type mới
- Mở rộng `entityRouteMap`: `quotation → /bao-gia`, `contract → /hop-dong`, `booking → /dat-tour/{id}`, `employee → /nhan-su/{id}`, `leave_request → /quan-ly-nghi-phep`

## Lớp 6 — UserGuide.tsx

**6.1 Rewrite `PushNotifGuide()`:**
- Thay nội dung "vào Cài đặt" bằng 2 cách: Header (BellOff icon) + Hồ sơ cá nhân (PushNotificationCard)
- Lưu ý đa thiết bị / iOS Add to Home Screen / iframe / browser blocked / Intern-Sales mọi role đều bật được

**6.2 Thêm `EscalationPolicyGuide()`** (render cho ADMIN/GDKD/MANAGER/HR_MANAGER):
- Giải thích Lv0 → Lv1 → Lv2 (lớp 5 sắp triển khai)
- Liệt kê 8 loại cảnh báo tự động

**6.3 Thêm `LeaveNotificationGuide()`** (render cho HR + Manager):
- Khi nào nhận noti đơn nghỉ phép
- Cách approve/reject

## Files thay đổi

| File | Loại | Ghi chú |
|---|---|---|
| Migration mới (3 phần) | DB schema | notifications cols + read_at trigger + leave_requests trigger |
| `supabase/functions/daily-reminders/index.ts` | Edit | +1 block escalation + 6 block deadline |
| `src/components/NotificationBell.tsx` | Edit | +6 icons & routes |
| `src/pages/UserGuide.tsx` | Edit | Rewrite PushNotifGuide + 2 section mới |

## NGOÀI PHẠM VI (hoãn lượt sau)
- Lớp 4: Dashboard EscalationWatchCard
- Lớp 5: Auto-acknowledge khi user thao tác form
- KHÔNG đụng: usePermissions.ts, B2B Tour, Settings, Dashboard hiện tại

## An toàn khi triển khai
- Verify schema cột thực tế (`bookings.deposit_due_at`, `quotations.status/sent_at`, `employees.date_of_birth/contract_end_date`, `leave_requests.*`) trước khi viết SQL/edge function
- Cột nào không tồn tại → SKIP block đó, báo lại cho anh, KHÔNG tự ý tạo cột mới
- Dùng `pg_net` (đã enabled cho daily-reminders cron) — verify extension trước khi tạo trigger leave_requests
