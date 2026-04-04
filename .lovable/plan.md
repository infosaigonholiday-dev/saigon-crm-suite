

# Khắc phục trùng lặp giữa "Vị trí" và "Quyền hệ thống"

## Vấn đề

Hiện tại hệ thống có 2 trường gần giống nhau:
- `employees.position` (text tự do) — hiển thị trong hồ sơ nhân viên, VD: "Trưởng phòng", "Nhân viên"
- `profiles.role` (enum cố định) — quyết định toàn bộ phân quyền hệ thống, VD: `MANAGER`, `HCNS`

Hai trường này dễ bị lệch nhau (VD: position = "Trưởng phòng" nhưng role = `HCNS`), gây nhầm lẫn.

## Giải pháp đề xuất: Tự động gợi ý role khi chọn Vị trí

Thay vì xóa bỏ trường nào, giữ cả hai nhưng **liên kết chúng thông minh hơn**:

### 1. Chuyển "Vị trí" từ text tự do thành dropdown có sẵn
- Thay `<Input>` bằng `<Select>` với danh sách chức vụ chuẩn: Trưởng phòng, Phó phòng, Nhân viên, Thực tập sinh, Giám đốc, v.v.
- File: `src/components/employees/EmployeeFormDialog.tsx`

### 2. Tự động gợi ý quyền hệ thống phù hợp
- Khi chọn vị trí + phòng ban, hệ thống tự gợi ý role phù hợp trong tab "Quyền hệ thống"
- VD: Vị trí "Trưởng phòng" + Phòng HCNS → gợi ý `HR_MANAGER`
- VD: Vị trí "Nhân viên" + Phòng KD Nội địa → gợi ý `SALE_DOMESTIC`

### 3. Cảnh báo khi role và position không khớp
- Logic `detectRoleMismatch` hiện có trong `EmployeeRoleTab.tsx` sẽ được mở rộng để so sánh chính xác hơn dựa trên mapping position → role

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `EmployeeFormDialog.tsx` | Đổi trường "Chức vụ" từ Input thành Select với danh sách chuẩn |
| `EmployeeRoleTab.tsx` | Thêm logic auto-suggest role dựa trên position + department, mở rộng cảnh báo mismatch |

### Kết quả
- Giảm thiểu lỗi nhập liệu sai vị trí
- Tự động gợi ý quyền phù hợp, giảm thao tác thủ công
- Cảnh báo rõ ràng khi vị trí và quyền không đồng bộ

