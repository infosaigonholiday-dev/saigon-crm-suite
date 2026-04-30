## Bug root cause (đã xác nhận bằng SQL)

Khi gọi `public.rpc_notification_stats_by_user()` Postgres báo:

```
ERROR: 42704: type "app_role" does not exist
QUERY: NOT ( public.has_role(auth.uid(), 'ADMIN'::app_role) OR ... )
CONTEXT: PL/pgSQL function rpc_notification_stats_by_user() line 3 at IF
```

Dự án này dùng **role kiểu `text`** (`has_role(uuid, text)`), KHÔNG có enum `app_role`. RPC vừa được thêm dùng cast `::app_role` nên fail ngay ở dòng IF authorization → toàn bộ function ném exception → React Query nhận lỗi → bảng UI rơi vào nhánh empty và hiển thị "Chưa có dữ liệu thông báo trong 90 ngày", trong khi `rpc_notification_overview` (không có check role kiểu này) vẫn chạy nên KPI vẫn ra số 162 / 86.

Dữ liệu raw đã verify có đầy đủ (Admin: 47 tb / 46 đã đọc, mai xuân khánh 16/1, …), nên đây là lỗi function chứ không phải lỗi data hay join.

## Phạm vi sửa

### 1. Migration: viết lại `rpc_notification_stats_by_user()`

- Bỏ mọi cast `::app_role`. Gọi `public.has_role(auth.uid(), 'ADMIN')`, `'SUPER_ADMIN'`, `'HR_MANAGER'`, `'GDKD'`, `'MANAGER'` ở dạng text.
- Giữ `SECURITY DEFINER`, `SET search_path = public`.
- Giữ LEFT JOIN profiles → notifications, group theo `p.id`, `HAVING COUNT(n.id) > 0`. Logic này đúng, chỉ phần authorization gây crash.
- `GRANT EXECUTE ON FUNCTION public.rpc_notification_stats_by_user() TO authenticated;` (đã có PUBLIC nhưng grant lại cho rõ).
- Đồng thời rà lại 2 RPC liên quan có thể dính cùng lỗi cast: `rpc_notification_critical_overdue`, `rpc_notification_unread_by_user`. Nếu cũng dùng `::app_role`, sửa cùng migration. (Sẽ kiểm tra `pg_get_functiondef` trước khi viết SQL.)

### 2. UI: `src/components/settings/SettingsNotificationStatsTab.tsx`

- Trong các `useQuery` cho `rpc_notification_stats_by_user`, `rpc_notification_unread_by_user`, `rpc_notification_critical_overdue`: log `error` ra console và trả về `[]` thay vì để toàn bộ component im lặng.
- Hiển thị banner cảnh báo phía trên bảng "Tình trạng đọc theo nhân sự" khi:
  - `byUserFull.length === 0` **và** `Number(overview?.sent_7d ?? 0) > 0`
  - hoặc query bị error.
  Nội dung: "Có notification nhưng không tổng hợp được theo nhân sự — RPC `rpc_notification_stats_by_user` lỗi. Xem console để biết chi tiết."
- Không thay đổi cấu trúc cột; chỉ thêm error surface.

### 3. Verification sau khi apply

- Chạy `SELECT * FROM public.rpc_notification_stats_by_user() LIMIT 5;` → phải trả ra rows (Admin 47/46, …).
- Mở Settings → Thống kê thông báo bằng tài khoản Admin: bảng "Tình trạng đọc theo nhân sự" có dữ liệu, cột Đã đọc / Chưa đọc / Khẩn chưa đọc / Lần đọc gần nhất hiển thị đúng số đã thấy trong query raw.
- Đăng nhập một user Sale thường vào trang đó → vẫn nhận `Unauthorized` (RPC raise) và banner cảnh báo hiện ra (đúng hành vi: chỉ Admin/HR/GDKD/Manager xem được).
- Click 1 notification ở Trung tâm Cảnh báo → kiểm DB `is_read=true`, `read_at` có timestamp, `action_status` không đổi; refresh Stats → `read_count` tăng, `last_read_at` cập nhật.

## Không nằm trong phạm vi

- Không tạo bảng mới, không đổi schema `notifications` / `profiles`.
- Không đổi UI Lịch sử thông báo và filter — phần đó đã chạy.
- Không đụng tới logic đánh dấu đã đọc (`markNotificationRead`, trigger `trg_notifications_set_read_at`) vì đã hoạt động đúng.
