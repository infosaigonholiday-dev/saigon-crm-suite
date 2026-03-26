

## Cải thiện toàn diện Module Nhân sự & Cài đặt

### 1. Trang Cài đặt — Thêm tabs quản lý

**File: `src/pages/Settings.tsx`** — Refactor thành Tabs layout:

- **Tab "Tài khoản"**: Giữ nguyên code quản lý tài khoản hiện tại
- **Tab "Phòng ban"**: CRUD phòng ban (table `departments`) — thêm/sửa/xóa với dialog form (tên, mã, manager)
- **Tab "Cấp bậc"**: CRUD cấp bậc/chức danh — sử dụng bảng `app_settings` với key `levels` hoặc hardcode danh sách quản lý trong state (vì DB không có bảng riêng). Sẽ lưu vào `app_settings` với key=`employee_levels`, value=JSON array
- **Tab "Quyền hạn"**: Hiển thị bảng tất cả roles với mô tả chi tiết quyền (read-only reference table, không cần DB mới)

### 2. Danh sách Nhân sự — Cải thiện UX

**File: `src/pages/Employees.tsx`**:

- Thêm Avatar circle (initials từ tên) bên cạnh cột Họ tên
- Thêm Badge cấp bậc (level) bên cạnh tên
- Thêm cột action cuối với icon buttons Sửa (mở EmployeeFormDialog) + Xóa (AlertDialog confirm → soft delete)
- Fix hiển thị phone/email: đã đúng logic, chỉ hiện "—" khi null — giữ nguyên

### 3. Form Thêm nhân viên — Tab Công việc

**File: `src/components/employees/EmployeeFormDialog.tsx`**:

- Đổi field "Cấp bậc" từ Input → Select dropdown, lấy danh sách từ `app_settings` (key=`employee_levels`)
- Thêm field "Role hệ thống" (Select dropdown roleOptions) trong form — chỉ hiện khi tạo mới (không edit)
- Thêm field "Email đăng nhập" — khi có email + role, sau khi insert employee thành công → tự động gọi edge function tạo tài khoản và liên kết

### 4. Chi tiết nhân viên — Tab Phân quyền

**File: `src/components/employees/EmployeeRoleTab.tsx`**:

- Thêm toggle bật/tắt tài khoản (gọi edge function activate/deactivate) khi profile đã tồn tại
- Giữ nguyên các tính năng hiện có (đổi role, gửi reset email)

### 5. UX tổng thể

- Dialog animation: thêm `className="animate-scale-in"` cho DialogContent (đã có keyframes trong tailwind config)
- Confirmation dialog xóa nhân viên: dùng AlertDialog (đã có trong EmployeeDetail, thêm vào list view)
- Toast: đã có sonner toast khắp nơi — giữ nguyên
- Responsive: kiểm tra và đảm bảo grid cols responsive

### 6. Database — Lưu danh sách cấp bậc

Insert 1 record vào `app_settings`:
```sql
INSERT INTO app_settings (key, value, description)
VALUES ('employee_levels', '["Intern","Junior","Senior","Lead","Manager","Director"]', 'Danh sách cấp bậc nhân viên')
ON CONFLICT (key) DO NOTHING;
```

### Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Settings.tsx` | Refactor thành Tabs: Tài khoản, Phòng ban, Cấp bậc, Quyền hạn |
| `src/pages/Employees.tsx` | Avatar, level badge, action buttons (sửa/xóa) trên mỗi hàng |
| `src/components/employees/EmployeeFormDialog.tsx` | Level dropdown, thêm field Role + Email đăng nhập khi tạo mới |
| `src/components/employees/EmployeeRoleTab.tsx` | Toggle active/inactive tài khoản |
| SQL insert | Thêm `employee_levels` vào `app_settings` |

