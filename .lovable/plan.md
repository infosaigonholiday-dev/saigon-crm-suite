

## Kế hoạch: Phân quyền 3 cấp HCNS + Bảng so sánh chi tiết

### Quy ước role mới cho phòng HCNS

| Cấp bậc | Role trong hệ thống | Tên hiển thị |
|---|---|---|
| Nhân viên HCNS | `HCNS` | Nhân viên HCNS |
| Leader HCNS | `HR_MANAGER` | Leader HCNS |
| Trưởng phòng HCNS | Dùng `HR_MANAGER` + override hoặc tạo role mới | Trưởng phòng HCNS |

**Vấn đề**: DB constraint `profiles_role_check` chỉ cho phép các role đã định nghĩa. Hiện không có role riêng cho "Trưởng phòng HCNS". Có 2 cách:
- **Cách 1**: Dùng `HCNS` = nhân viên, `HR_MANAGER` = leader, thêm role mới `HR_HEAD` = trưởng phòng (cần migration thêm vào constraint)
- **Cách 2**: Dùng `HCNS` = nhân viên, `HR_MANAGER` = trưởng phòng, leader dùng override quyền

Tôi đề xuất **Cách 1** vì rõ ràng nhất. Bảng quyền chi tiết:

### Bảng quyền chi tiết 3 cấp HCNS

| Permission | Nhân viên HCNS (`HCNS`) | Leader HCNS (`HR_MANAGER`) | Trưởng phòng HCNS (`HR_HEAD`) |
|---|:---:|:---:|:---:|
| **Nhân sự** | | | |
| employees.view | ✅ | ✅ | ✅ |
| employees.create | ✅ | ✅ | ✅ |
| employees.edit | ✅ | ✅ | ✅ |
| employees.delete | ❌ | ✅ | ✅ |
| **Nghỉ phép** | | | |
| leave.view | ✅ | ✅ | ✅ |
| leave.create | ✅ | ✅ | ✅ |
| leave.approve | ❌ | ✅ | ✅ |
| **Bảng lương** | | | |
| payroll.view | ✅ | ✅ | ✅ |
| payroll.create | ✅ | ✅ | ✅ |
| payroll.edit | ❌ | ✅ | ✅ |
| **Booking / Hợp đồng** | | | |
| bookings.view | ❌ | ❌ | ✅ |
| **Báo giá** | | | |
| quotations.view | ❌ | ❌ | ✅ |
| **Thanh toán** | | | |
| payments.view | ❌ | ❌ | ✅ |
| **Khách hàng** | | | |
| customers.view | ❌ | ❌ | ❌ |
| **Tài chính** | | | |
| finance.view | ❌ | ❌ | ❌ |
| **Cài đặt** | | | |
| settings.view | ❌ | ❌ | ❌ |

### Thay đổi cần thực hiện

**1. Migration DB** -- thêm role `HR_HEAD` vào constraint + cập nhật DB function

- Sửa constraint `profiles_role_check` thêm `HR_HEAD`
- Cập nhật function `get_default_permissions_for_role` thêm case `HR_HEAD`
- Cập nhật function `prevent_role_change` thêm `HR_HEAD` vào danh sách được phép đổi role
- Cập nhật RLS policies trên các bảng employees, payroll, leave_requests, etc. thêm `HR_HEAD`

**2. File `src/hooks/usePermissions.ts`**

- Sửa `HCNS`: bỏ `customers.view`, bỏ `employees.delete`, bỏ `leave.approve`, bỏ `payroll.edit`
- Sửa `HR_MANAGER`: bỏ `customers.view`, thêm `employees.delete`, `leave.approve`, `payroll.edit`
- Thêm `HR_HEAD`: tất cả quyền HR + `bookings.view`, `quotations.view`, `payments.view`

**3. File `src/components/settings/SettingsRolesTab.tsx`**

- Cập nhật label: HCNS → "Nhân viên HCNS", HR_MANAGER → "Leader HCNS", thêm HR_HEAD → "Trưởng phòng HCNS"

**4. Cập nhật role cho Lê Thị Thủy Tiên**

- Đổi role từ `MANAGER` sang `HR_HEAD` trong bảng profiles (dùng insert tool)

**5. Cập nhật Edge Function `manage-employee-accounts`**

- Thêm `HR_HEAD` vào danh sách role hợp lệ nếu cần

