## Tính năng: Gửi thông báo broadcast theo phân loại nhân viên

Cho phép người có quyền (ADMIN, GDKD, MANAGER, HCNS) soạn 1 thông báo và gửi đến nhiều nhân viên cùng lúc, lọc theo: **phòng ban**, **vai trò**, **loại nhân sự** (chính thức / thực tập), hoặc **chọn từng người**. Thông báo đến qua **chuông trong app + Web Push (OneSignal)**.

---

### 1. Trang mới: "Gửi thông báo" (`/gui-thong-bao`)

Hiển thị trong sidebar nhóm Admin, chỉ ai có quyền mới thấy.

**Form gồm:**
- **Tiêu đề** (bắt buộc, ≤120 ký tự)
- **Nội dung** (bắt buộc, textarea ≤500 ký tự)
- **Mức độ ưu tiên**: Bình thường / Cao / Khẩn (ảnh hưởng màu badge và push)
- **Đường dẫn khi click** (tuỳ chọn, mặc định `/`)
- **Đối tượng nhận** — 4 chế độ chọn (tabs):
  1. **Tất cả nhân viên đang hoạt động**
  2. **Theo loại nhân sự**: ☑ Chính thức (role không bắt đầu bằng `INTERN_`) ☑ Thực tập (role bắt đầu bằng `INTERN_`)
  3. **Theo phòng ban**: multi-select 9 phòng ban
  4. **Theo vai trò**: multi-select 22 roles (có nhóm "Chọn tất cả Sale", "Chọn tất cả Điều hành"...)
  5. **Chọn từng người**: search + multi-select profiles

- **Preview danh sách người nhận**: hiển thị `Sẽ gửi đến N người` + danh sách tên (collapse), refresh realtime khi đổi filter
- Nút **Gửi ngay** (confirm dialog)

### 2. Phân quyền

Thêm permission key mới: `notifications.broadcast`
- ADMIN: tất cả phòng ban, tất cả vai trò
- GDKD: chỉ phòng Kinh doanh + Sale roles
- MANAGER: chỉ phòng ban của mình
- HCNS: tất cả nhân viên (vì là HR)
- Các role khác: không thấy menu

PermissionGuard chặn route, useModuleScope giới hạn danh sách người nhận hiển thị trong filter (không cho gửi vượt scope).

### 3. Backend — Edge Function mới `broadcast-notification`

Input:
```
{ title, message, priority, url, target_user_ids: string[] }
```
- Validate sender có quyền `notifications.broadcast` và mọi user_id trong `target_user_ids` nằm trong scope của sender (kiểm tra qua service_role)
- Bulk insert vào bảng `notifications` (1 record mỗi user) → trigger có sẵn `trg_notifications_push` tự động gọi `send-notification` cho từng user
- Trả về `{ ok, sent_count, failed_count }`
- Log vào bảng `audit_logs` (action: `BROADCAST_NOTIFICATION`)

Lý do dùng edge function: bulk insert vài chục—vài trăm record cùng lúc, cần service_role để bypass RLS check sender, và để gom audit log.

### 4. Lịch sử broadcast

Tab "Lịch sử gửi" cùng trang `/gui-thong-bao`:
- Bảng: Ngày | Tiêu đề | Người gửi | Số người nhận | Đã đọc / Tổng | Hành động
- Click → modal xem nội dung gốc + danh sách ai đã đọc / chưa đọc

Lưu vào bảng mới `broadcast_messages` để truy vết:
```
id, title, message, priority, url, target_filter (jsonb), recipient_ids (uuid[]),
sent_by, sent_at, sent_count
```

### 5. Web Push

Tận dụng pipeline có sẵn: `notifications` INSERT → `trg_notifications_push` → edge function `send-notification` → OneSignal → device.
Không cần chỉnh `send-notification`. Chỉ thêm 1 type mới `BROADCAST` để bell trong app hiển thị icon riêng (📢).

---

### Chi tiết kỹ thuật

**Database migration:**
- Tạo bảng `broadcast_messages` (RLS: ADMIN/GDKD/MANAGER/HCNS xem broadcast họ gửi; ADMIN xem tất cả)
- Thêm `'BROADCAST'` vào enum/check constraint của `notifications.type` (nếu có) — *nếu là check constraint thì DROP constraint thay vì thêm value, theo policy dự án*
- Thêm permission `notifications.broadcast` vào `DEFAULT_PERMISSIONS` cho ADMIN/GDKD/MANAGER/HCNS

**Edge Function `broadcast-notification`:**
- Verify JWT trong code, lấy sender role+department
- Server-side scope check: re-query `profiles` với filter giống client, intersect với `target_user_ids`
- Insert `broadcast_messages` (1 row) + `notifications` (N rows) trong 1 transaction (RPC function `broadcast_notification_insert`)

**Frontend:**
- File mới: `src/pages/BroadcastNotification.tsx`
- File mới: `src/components/notifications/RecipientSelector.tsx` (4 tabs filter + preview)
- Thêm route trong `App.tsx`
- Thêm menu item trong `AppSidebar.tsx` nhóm "Quản trị"
- Thêm `notifications.broadcast` vào `usePermissions.ts` + `PermissionEditDialog`

**Test thực tế sau khi build:**
1. Login ADMIN → mở `/gui-thong-bao` → chọn "Theo loại nhân sự" → tick cả Chính thức + TTS → preview hiện 28 người (theo số liệu DB: 1+2+1+2+1+1+1+10+4+1+3+2 = 29) → gửi → check bảng `notifications` có 29 row mới → check chuông trong app của 1 user khác có badge → check device đã subscribe push có nhận
2. Login GDKD → chỉ chọn được Sale roles, không thấy phòng HCNS → bypass thử bằng devtools sửa target_user_ids → edge function reject 403
3. Tab "Lịch sử" → thấy broadcast vừa gửi → click → danh sách 29 recipient + ai đã đọc

---

### Câu hỏi xác nhận trước khi build

1. **Phạm vi quyền gửi**: Chốt 4 role (ADMIN, GDKD, MANAGER, HCNS) như trên, hay muốn thêm/bớt?
2. **Lưu lịch sử broadcast**: Có cần bảng `broadcast_messages` để CEO audit về sau, hay chỉ cần ghi `audit_logs` là đủ?
3. **Giới hạn**: Có muốn rate-limit (vd: tối đa 5 broadcast/giờ/user) không?

Trả lời 3 câu này (hoặc nói "OK hết, làm theo plan") để tôi triển khai.