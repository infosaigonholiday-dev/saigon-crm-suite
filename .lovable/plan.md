

## Fix form "Thêm nhân viên" - 2 lỗi

### Lỗi 1: Không nhập liên tục được (input mất focus)
**Nguyên nhân**: Component `Field` được khai báo **bên trong** function `EmployeeFormDialog`. Mỗi lần state thay đổi (gõ ký tự) → React tạo lại `Field` mới → input mất focus.

**Fix**: Di chuyển `Field` ra ngoài component `EmployeeFormDialog` thành một component riêng biệt ở top-level.

### Lỗi 2: Mã nhân viên và Phòng ban không thấy
**Nguyên nhân**: 2 trường này nằm trong tab "Công việc" (tab 2), user mở dialog chỉ thấy tab "Cá nhân" (tab 1).

**Fix**: Chuyển "Mã nhân viên" (với nút Tự động) và "Phòng ban" lên tab "Cá nhân" — đây là thông tin cơ bản cần nhập ngay khi thêm nhân viên.

### File thay đổi
- `src/components/employees/EmployeeFormDialog.tsx`

