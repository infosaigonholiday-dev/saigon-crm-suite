

## Trang Cài đặt - Quản lý tài khoản nhân viên (chỉ ADMIN)

### Tổng quan

Thay thế trang ComingSoon "Cài đặt" bằng trang Settings thực tế, trong đó có mục "Quản lý tài khoản nhân viên" chỉ hiển thị cho user có role ADMIN trong bảng `profiles`.

### Kiến trúc

- **Kiểm tra quyền ADMIN**: Query bảng `profiles` với `auth.uid()` để lấy `role`. Nếu không phải ADMIN, ẩn mục quản lý tài khoản.
- **Danh sách tài khoản**: Query bảng `profiles` join `departments` để hiển thị email, full_name, department, role, is_active.
- **Tạo tài khoản mới**: Cần Edge Function vì `supabase.auth.admin.createUser()` yêu cầu service_role key (không thể dùng từ client).
- **Vô hiệu hóa/kích hoạt**: Cũng cần Edge Function để gọi `supabase.auth.admin.updateUserById()` và update `profiles.is_active`.

### Các bước thực hiện

**1. Tạo Edge Function `manage-employee-accounts`**

Xử lý 3 action:
- `create`: Nhận `full_name, email, department_id, role` → gọi `auth.admin.createUser()` với email + password tạm → insert vào `profiles` → trả về kết quả. Supabase sẽ tự gửi email xác nhận.
- `deactivate`: Nhận `user_id` → gọi `auth.admin.updateUserById(id, { ban_duration: '876000h' })` → update `profiles.is_active = false`.
- `activate`: Nhận `user_id` → gọi `auth.admin.updateUserById(id, { ban_duration: 'none' })` → update `profiles.is_active = true`.

Edge Function sẽ verify JWT và kiểm tra caller có role ADMIN trong `profiles` trước khi thực hiện.

**2. Tạo trang `src/pages/Settings.tsx`**

- Tab hoặc section "Quản lý tài khoản nhân viên"
- Bảng danh sách: email, họ tên, phòng ban, role, trạng thái (active/inactive), nút toggle
- Nút "Thêm nhân viên mới" mở Dialog form: họ tên, email, chọn phòng ban (dropdown từ `departments`), chọn role
- Gọi Edge Function cho create/activate/deactivate

**3. Cập nhật `src/App.tsx`**

Thay route `/cai-dat` từ `ComingSoon` sang component `Settings` mới.

### Chi tiết kỹ thuật

- Edge Function dùng `SUPABASE_SERVICE_ROLE_KEY` (đã có sẵn trong secrets)
- Password tạm tạo ngẫu nhiên, user sẽ nhận email từ Supabase Auth để đặt lại
- Roles có thể chọn: `ADMIN`, `DIRECTOR`, `DIEUHAN`, `HCNS`, `SALE_DOMESTIC`, `SALE_INBOUND`, `SALE_OUTBOUND`, `KETOAN`
- RLS trên `profiles` đã cho phép ADMIN đọc tất cả profiles (policy `profiles_admin`)

