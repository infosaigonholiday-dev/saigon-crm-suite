# Sprint 1 - Tour File System: Hoàn thiện tích hợp

Đã xong: DB migration, các trang TourFiles + TourFileDetail, components, sidebar nav, fix lỗi `Briefcase` import.

## Còn lại

### 1. Tích hợp Bookings ↔ Tour File
File: `src/pages/Bookings.tsx`, `src/components/bookings/BookingFormDialog.tsx`
- Thêm select `booking_type` (retail / group_tour / mice / fit / corporate) trong form Booking. Default `retail`.
- Trong bảng Bookings: thêm cột "Loại" badge + cột "Tour File" hiển thị link `TF-YYYY-####` nếu booking đã link.
- Filter theo `booking_type` ở thanh filter.
- Khi tạo booking với type ≠ `retail` → hiển thị nút "Tạo Tour File từ Booking này" (mở `TourFileFormDialog` prefill `booking_id`, customer, dates).
- Trong `TourFileDetail` Overview: hiển thị link sang booking gốc nếu có.

### 2. Dashboard widgets vận hành
File: `src/pages/Dashboard.tsx` (hoặc tạo `src/components/dashboard/TourOpsWidgets.tsx`)
- Gọi RPC `rpc_tour_dashboard_stats` 1 query duy nhất.
- 4 KPI cards:
  - Task quá hạn (theo phòng ban của user / global cho ADMIN-OPS)
  - Task chờ kiểm (`done_pending_check`)
  - Tour sắp khởi hành ≤ 7 ngày còn task chưa duyệt
  - Tour File risk = `high`
- Hiển thị cho roles: ADMIN, SUPER_ADMIN, OPS_*, DIEUHAN, GDKD, MANAGER_*. Sales chỉ thấy task của mình.
- Click card → điều hướng sang `/tour-files` với filter tương ứng (URL params).

### 3. URL filter trong TourFiles
File: `src/pages/TourFiles.tsx`
- Đọc query params `?stage=`, `?risk=`, `?overdue=true`, `?pending_check=true` để filter danh sách.

### 4. QA / Testing
- Chạy `supabase--linter` để bắt RLS warnings.
- Test thực tế bằng `supabase--read_query`:
  - Tạo 1 tour_file mới → verify code `TF-2026-####` auto-gen.
  - Insert task `evidence_required=true` không có evidence → assert trigger chặn khi transition sang `done_pending_check`.
  - Insert task rồi UPDATE `status='approved_done'` với `checked_by = assignee` → assert chặn self-approve.
  - Test RLS cho 3 role: SALE_HCM (chỉ tour của mình), DIEUHAN (toàn bộ), ACCOUNTANT (toàn bộ).

### 5. Memory
Lưu `mem://features/tour-files/sprint-1` mô tả: schema cốt lõi, workflow task, RLS scoping, RPC dashboard, integration Bookings.

## Definition of Done
- Booking khách lẻ giữ nguyên hành vi (default `retail`, không đụng UI cũ).
- Tạo được Tour File từ Booking group_tour/mice với prefill.
- Dashboard hiện 4 widget vận hành click được.
- RLS test pass cho 5 role.
- Linter không cảnh báo critical mới.
