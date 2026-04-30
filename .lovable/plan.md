# Hoàn thiện cơ chế "Đã đọc" thông báo

## 1. Hiện trạng đã xác minh

Bảng `public.notifications` đã có đủ cột yêu cầu: `id, user_id, type, title, message, entity_type, entity_id, is_read (default false), created_at, read_at (nullable), priority, escalation_level, escalated_at`.

**Vấn đề phát hiện**: Toàn bộ client code (`NotificationBell.tsx`, `AlertsCenter.tsx`, `useAutoMarkNotificationsRead.ts`) chỉ set `is_read = true` mà KHÔNG set `read_at`. Hiện đã có 2 dòng `is_read=true` nhưng `read_at IS NULL`. Cần bịt rò rỉ ở client + backfill dữ liệu cũ.

Ngoài ra chưa có cột `action_completed_at` để phân biệt "đã đọc" vs "đã xử lý".

## 2. Thay đổi Database (1 migration)

- Thêm cột `action_completed_at timestamptz NULL` và `action_completed_by uuid NULL` vào `notifications`.
- Tạo trigger `BEFORE UPDATE` tự set `read_at = now()` khi `is_read` chuyển từ `false → true` mà client quên gửi `read_at` (an toàn nhiều lớp).
- Backfill: `UPDATE notifications SET read_at = COALESCE(read_at, created_at) WHERE is_read = true AND read_at IS NULL;`
- Tạo 2 RPC SECURITY DEFINER cho dashboard admin (chỉ ADMIN/SUPER_ADMIN/HR_MANAGER được gọi, kiểm tra qua `has_role`):
  - `rpc_notification_unread_by_user()` → trả về `user_id, full_name, department, unread_total, unread_high_critical, oldest_unread_at`.
  - `rpc_notification_critical_overdue()` → các notification `priority IN ('high','critical')` chưa đọc > 24h, kèm tên người nhận.
- Index hỗ trợ: `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;`
- KHÔNG động vào RLS hiện tại (mỗi user vẫn chỉ thấy notification của mình; admin xem qua RPC SECURITY DEFINER).

## 3. Sửa rule mark-read ở client

**Bỏ auto-mark khi mở dropdown** — hành vi hiện tại đã đúng (chỉ mark khi click row hoặc bấm "Đánh dấu tất cả"). Chuẩn hóa lại payload:

- `NotificationBell.tsx` (2 chỗ update): đổi sang `.update({ is_read: true, read_at: new Date().toISOString() })`.
- `AlertsCenter.tsx` (2 chỗ update): tương tự.
- `useAutoMarkNotificationsRead.ts`: cùng cách. Hook này chỉ chạy khi user mở trang chi tiết entity → vẫn đúng tinh thần "chỉ mark khi xem chi tiết".

Tạo helper `src/lib/markNotificationRead.ts` để 4 chỗ trên dùng chung, tránh lệch payload sau này.

## 4. Trang Lịch sử thông báo (`SettingsNotificationHistoryTab.tsx`)

- Thêm cột **"Đã đọc lúc"** hiển thị `read_at` (format `dd/MM/yyyy HH:mm`); nếu `is_read=false` hiển thị thời lượng chưa đọc bằng `formatDistanceToNow(created_at)` kèm icon đồng hồ.
- Filter trạng thái: dropdown `Tất cả | Chưa đọc | Đã đọc` (đặt cạnh filter loại hiện có), áp `.eq('is_read', ...)` ở query.
- Badge cảnh báo SLA: nếu `priority IN ('high','critical')` và `is_read=false` và `now - created_at > 24h` → badge đỏ "Quá 24h chưa đọc".
- Mở rộng limit lên 100 và thêm phân trang đơn giản (Trước/Sau, 50/page) vì thêm filter sẽ cần xem nhiều hơn.

## 5. Dashboard Admin — tab thống kê mới

Tạo `src/components/settings/SettingsNotificationStatsTab.tsx` đặt cạnh tab Lịch sử trong `Settings.tsx` (chỉ ADMIN/SUPER_ADMIN/HR_MANAGER thấy):

- **Card 1 — Tổng quan**: tổng chưa đọc toàn hệ thống, tổng critical/high quá 24h, số nhân sự có ≥1 chưa đọc.
- **Card 2 — Critical/High quá hạn 24h**: bảng từ `rpc_notification_critical_overdue` (người nhận, loại, tiêu đề, tạo lúc, số giờ trễ).
- **Card 3 — Top 10 nhân sự nhiều chưa đọc nhất**: từ `rpc_notification_unread_by_user` order by `unread_total DESC`, kèm cột `unread_high_critical` và `oldest_unread_at`.
- Nút "Tải lại" + auto refetch 60s.

## 6. Tách rõ "đã đọc" vs "đã xử lý"

- Document trong tooltip cột trạng thái: "Đã đọc = đã xem, KHÔNG đồng nghĩa đã xử lý".
- Cột `action_completed_at` mới sẵn sàng cho các loại action-required (PAYMENT_DUE, FOLLOW_UP_OVERDUE, TRANSACTION_APPROVAL...). Lần này chỉ tạo cột + 1 RPC `rpc_notification_complete_action(notification_id)` để các module sau gọi khi user thật sự hoàn thành công việc. Không đổi UI module nghiệp vụ trong scope này (sẽ làm ở các task riêng khi cần).

## 7. Bằng chứng nghiệm thu sẽ chạy sau khi implement

- `SELECT count(*) FILTER (WHERE is_read AND read_at IS NULL)` → phải = 0 sau backfill.
- Click 1 notification trên bell → query lại row đó: `is_read=true`, `read_at` xấp xỉ `now()`.
- Mở dropdown bell mà KHÔNG click → unread count không đổi.
- Login bằng Sale → query `notifications` chỉ ra của chính mình (RLS đã có sẵn, chỉ verify lại).
- Login Admin → tab thống kê hiển thị danh sách top unread.

## Files dự kiến chạm

- Migration mới: cột + trigger + 2 RPC + backfill + index.
- `src/lib/markNotificationRead.ts` (mới)
- `src/components/NotificationBell.tsx`
- `src/pages/AlertsCenter.tsx`
- `src/hooks/useAutoMarkNotificationsRead.ts`
- `src/components/settings/SettingsNotificationHistoryTab.tsx`
- `src/components/settings/SettingsNotificationStatsTab.tsx` (mới)
- `src/pages/Settings.tsx` (gắn tab mới)
