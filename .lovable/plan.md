## Mục tiêu

Nâng cấp 2 tab Settings → Notifications để CEO/Admin thấy rõ ai đã đọc / chưa đọc / xử lý chưa, đồng thời siết lại nguyên tắc "Đã gửi ≠ Đã đọc ≠ Đã xử lý" và bổ sung filter nghiệp vụ.

Hiện trạng (đã có sẵn, không xây lại):
- DB: `notifications` đủ cột `is_read, read_at, action_required, action_status, action_due_at, action_completed_at, action_completed_by, priority`.
- Trigger `trg_notifications_set_read_at` tự set `read_at = now()` khi `is_read` flip → giữ nguyên.
- RLS: `notifications_own` (user thấy của mình) + `admin_full_access` (ADMIN/SUPER_ADMIN thấy hết) → đúng yêu cầu.
- `markNotificationRead` chỉ update `is_read + read_at`, KHÔNG đụng `action_status` → đúng nguyên tắc.
- 2 tab Settings: `SettingsNotificationHistoryTab.tsx` + `SettingsNotificationStatsTab.tsx` đã tồn tại nhưng thiếu cột/filter theo yêu cầu mới.

## Phạm vi thay đổi

### 1. Migration SQL (1 file)

**a. Mở RPC stats cho CEO/Management**
Thêm 2 role được phép gọi 3 RPC stats: `GDKD`, `MANAGER` (ngoài ADMIN/SUPER_ADMIN/HR_MANAGER hiện có) — để CEO/Quản lý xem dashboard tổng hợp.

**b. RPC mới `rpc_notification_stats_by_user()`**
Trả về đúng spec yêu cầu (1 hàng / nhân sự):
```
user_id, full_name, email, department,
total_notifications, read_count, unread_count,
unread_high_critical, pending_actions, overdue_actions,
last_read_at
```
Filter: chỉ tính 90 ngày gần nhất để tránh bảng phình. SECURITY DEFINER + check role như trên.

**c. View bổ trợ (optional, để query nhanh)**: bỏ qua — query trực tiếp `notifications` qua RLS đã đủ vì admin policy bypass.

### 2. `SettingsNotificationHistoryTab.tsx` — refactor

- **Thêm cột Email người nhận** (lấy từ `profiles.email` đã join sẵn).
- **Thêm cột "Mức độ"** (low/medium/high/critical) với badge màu.
- **Tách "Đọc lúc"**: nếu `is_read` → format `read_at`; nếu chưa → "—".
- **Cột "Chưa đọc bao lâu"**: nếu `is_read=false` → `formatDistanceToNow(created_at)` ("Chưa đọc 3 giờ"); nếu đã đọc → "—".
- **Trạng thái xử lý** (giữ cột cũ, mở rộng label): `Không cần xử lý / Chờ xử lý / Đang xử lý / Quá hạn / Đã xử lý / Bỏ qua`.
- **Badge bổ sung trong cột Đọc**:
  - `is_read=false` → "Chưa đọc"
  - `is_read=false` + priority high/critical → đỏ "Khẩn chưa đọc"
  - `is_read=true` + `action_required=true` + status ∈ pending/in_progress → vàng "Đã đọc, chưa xử lý"
  - `action_status='overdue'` → đỏ "Quá hạn xử lý"
  - `action_status='completed'` → xanh "Đã xử lý"
- **Filter mới (preset dropdown)** thay vì 2 select rời:
  ```
  Tất cả | Chưa đọc | Đã đọc | Khẩn chưa đọc |
  Cần xử lý | Quá hạn xử lý | Đã đọc nhưng chưa xử lý
  ```
  Map sang query supabase:
  - `urgent_unread`: `.eq("is_read",false).in("priority",["high","critical"])`
  - `need_action`: `.eq("action_required",true).in("action_status",["pending","in_progress"])`
  - `overdue`: `.eq("action_status","overdue")`
  - `read_unhandled`: `.eq("is_read",true).eq("action_required",true).in("action_status",["pending","in_progress","overdue"])`
- **Giữ** filter type + search + pagination 50/page hiện có.
- **Query select** bổ sung field theo spec: thêm `entity_type, related_entity_type, related_entity_id, profiles.email`.

### 3. `SettingsNotificationStatsTab.tsx` — bổ sung section mới

Giữ nguyên 4 KPI card + 2 bảng cũ. **Thêm Card mới "Tình trạng đọc theo nhân sự"** dùng RPC `rpc_notification_stats_by_user`, các cột:
```
Nhân sự | Email | Tổng TB | Đã đọc | Chưa đọc |
Khẩn chưa đọc | Action chưa xử lý | Quá hạn | Lần đọc gần nhất
```
Sort default: `unread_high_critical DESC, pending_actions DESC`.

### 4. Test nghiệm thu (sau khi build xong, chạy SQL kiểm chứng)

- Insert seed: 2 user A/B với 5 notification theo spec (critical chưa đọc, đã đọc-pending, completed, normal chưa đọc, overdue).
- Chạy 2 SQL kiểm chứng trong yêu cầu, paste output.
- Verify RLS: dùng `SET LOCAL role authenticated; SET LOCAL request.jwt.claims = '{"sub":"<sale-uuid>"}'` rồi `SELECT count(*) FROM notifications` — phải chỉ thấy của user đó.

## Không thay đổi

- Logic `markNotificationRead` (đã đúng — chỉ update is_read/read_at).
- Trigger `trg_notifications_set_read_at`.
- RLS policies hiện tại.
- `NotificationBell.tsx` (đã đúng nguyên tắc, chỉ navigate sau khi mark read).

## Files dự kiến tạo/sửa

- `supabase/migrations/<ts>_notification_stats_by_user.sql` (mới)
- `src/components/settings/SettingsNotificationHistoryTab.tsx` (refactor cột + filter preset)
- `src/components/settings/SettingsNotificationStatsTab.tsx` (thêm 1 Card mới)
- `mem://features/notifications/admin-visibility` (mới — lưu nguyên tắc Đã gửi ≠ Đã đọc ≠ Đã xử lý)
