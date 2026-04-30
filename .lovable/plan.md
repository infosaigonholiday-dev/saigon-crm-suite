# Drilldown chưa-đọc theo từng nhân sự

## Mục tiêu
Admin/CEO click vào một nhân sự (hoặc số "Chưa đọc" / "Khẩn chưa đọc" / "Chưa từng đọc") trong bảng "Tình trạng đọc theo nhân sự" → mở **Modal chi tiết** với 2 tab:
- **Tab 1 — Theo loại thông báo:** breakdown theo notification type (BROADCAST, FOLLOW_UP_OVERDUE, …)
- **Tab 2 — Danh sách chi tiết:** từng notification cụ thể, có filter

## Phạm vi thay đổi

### 1. Database (1 migration)
Tạo RPC mới `rpc_notification_stats_by_user_type` (`SECURITY DEFINER`, gated cho ADMIN/SUPER_ADMIN/HR_MANAGER/GDKD/MANAGER giống các RPC hiện có).

Input:
- `p_user_id uuid` (bắt buộc)
- `p_days int default 90`
- `p_read_status text default null` — `'read' | 'unread' | 'unread_high' | 'unread_24h'`
- `p_action_status text default null` — `'pending' | 'in_progress' | 'overdue' | 'completed' | 'pending_or_in_progress' | 'read_unhandled'`

Output (1 row mỗi `notification.type`):
- `notification_type`, `total_notifications`
- `read_count`, `unread_count`, `unread_high_critical`
- `pending_actions`, `overdue_actions`
- `oldest_unread_at`, `last_read_at`

(Nhóm nghiệp vụ + label tiếng Việt sẽ map ở client bằng `notificationGroups.ts` để tránh duplicate logic.)

Sắp xếp `ORDER BY unread_high_critical DESC, unread_count DESC, total_notifications DESC`.

### 2. Component mới `src/components/settings/UserNotificationDetailDialog.tsx`
- Dialog full-width (`max-w-6xl`) với header hiển thị tên + email + phòng ban + role của nhân sự.
- Filter bar trên cùng (áp dụng cho cả 2 tab):
  - Khoảng thời gian: 7/30/90/Tất cả (mặc định 90)
  - Loại thông báo, Nhóm nghiệp vụ
  - Trạng thái đọc, Mức độ, Trạng thái xử lý
- **Tab 1 "Theo loại thông báo":** 
  - Bảng từ `rpc_notification_stats_by_user_type` với cột: Loại / Nhóm / Tổng / Đã đọc / Chưa đọc / Khẩn chưa đọc / Action chờ / Quá hạn / Cũ nhất chưa đọc / Lần đọc gần nhất
  - Click 1 dòng → set filter `type` rồi switch sang Tab 2
- **Tab 2 "Danh sách chi tiết":**
  - Tái dùng `rpc_notification_audit_list` (đã có `p_user_id`) — KHÔNG tạo RPC mới.
  - Render bảng từng notification: Loại / Nhóm / Tiêu đề / Nội dung rút gọn / Mức độ / Gửi lúc / Trạng thái đọc / Đọc lúc / Chưa đọc bao lâu / Action / Trạng thái xử lý / Related entity / nút "Mở".
  - Pagination 50/trang client-side.
  - Nút "Mở" → dùng `getNotificationActionUrl` (đã có ở `src/lib/notificationActions.ts`) để route vào entity.

### 3. Sửa `SettingsNotificationStatsTab.tsx`
- Thay nút "Xem chi tiết" hiện tại bằng việc mở `UserNotificationDetailDialog`.
- Biến các ô số trong bảng "Tình trạng đọc theo nhân sự" thành **clickable button**:
  - **Tên nhân sự** → mở dialog (mặc định Tab 1, không filter)
  - **Số "Chưa đọc"** > 0 → mở dialog Tab 1 với preset `readStatus='unread'`
  - **Badge "Khẩn chưa đọc"** > 0 → mở dialog Tab 1 với preset `readStatus='unread_high'`
  - **"Chưa từng đọc"** (last_read_at null) → mở dialog Tab 2 với preset `readStatus='unread'`
  - **"Action chưa xử lý"** > 0 → mở dialog Tab 2 với preset `actionStatus='pending_or_in_progress'`
  - **"Quá hạn"** > 0 → mở dialog Tab 2 với preset `actionStatus='overdue'`
- Giữ nguyên Section 3 hiện tại (audit toàn hệ thống) — không xoá.

### 4. Test nghiệm thu (sẽ chạy sau khi build)
- Chọn 1 nhân sự có `unread_count > 0` → click số chưa đọc → dialog mở Tab 1, hiển thị breakdown loại nào chưa đọc.
- Click 1 dòng loại trong Tab 1 → tự nhảy Tab 2, lọc đúng `type`.
- Filter `FOLLOW_UP_OVERDUE` ở Tab 2 chỉ hiện đúng loại đó.
- Filter "Đã đọc nhưng chưa xử lý" chỉ hiện `is_read=true AND action_status IN ('pending','in_progress','overdue')`.
- Click "Chưa từng đọc" của 1 nhân sự → Tab 2 chỉ hiển thị notification chưa đọc của họ.

## Definition of Done
- Bảng tổng hợp nhân sự có drilldown đầy đủ, mọi con số/trạng thái đều click được.
- Dialog 2 tab hoạt động, filter đồng bộ.
- Admin/CEO trả lời được câu hỏi: "Nhân sự X chưa đọc loại nào, thông báo cụ thể nào?"
- Không tạo trùng RPC; tái dùng `rpc_notification_audit_list` cho Tab 2.
