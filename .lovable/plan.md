
# Kế hoạch fix - ĐÃ HOÀN THÀNH

## Các vấn đề đã fix

### 1. Đồng bộ dữ liệu giữa module Nhân sự và Cài đặt ✅
- `EmployeeFormDialog.tsx`: Khi lưu nhân viên có profile_id, tự động cập nhật profiles.department_id
- `SettingsAccountsTab.tsx`: Khi Admin đổi department, tự động cập nhật employees.department_id
- `EmployeeRoleTab.tsx`: Sau khi tạo tài khoản, đồng bộ employees.profile_id và department_id

### 2. Validate email trùng ✅
- `EmployeeFormDialog.tsx`: Kiểm tra email trùng trước khi lưu, hiện lỗi rõ ràng

### 3. HR_MANAGER thêm quyền xem Gói tour và Hợp đồng ✅
- `usePermissions.ts`: Thêm tour_packages.view, contracts.view
- DB function `get_default_permissions_for_role`: Đồng bộ tương ứng

### 4. Dọn dẹp phòng ban ✅
- Đổi "Phòng Điều hành Tour" → "OP Outbound" (code: OP_OUTBOUND)
- Xóa 4 phòng ban trùng: Ban Giám đốc (BGD), KD MICE, KD Nội địa, KD Outbound
- Còn lại 9 phòng ban chuẩn

## Lưu ý cho Admin
- Cập nhật email riêng cho "lê thị thảo linh" (SHT-002) — đang dùng chung email với SHT-004
- Kiểm tra level/position cho "mai xuân khánh" (SHT-005) cho khớp với role GDKD
