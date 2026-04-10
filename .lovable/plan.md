
Mình đã rà code và nguyên nhân hiện tại là:

- Nút xóa thực ra có trong `src/components/settings/SettingsAccountsTab.tsx`, nhưng nó chỉ nằm trong từng dòng của tab `Tài khoản`, không phải nút lớn riêng.
- Tab `Tài khoản` lại đang bị khóa trong `src/pages/Settings.tsx` với điều kiện `showAccounts = isAdmin`, tức chỉ `ADMIN` / `SUPER_ADMIN` mới thấy.
- Ngoài ra nút xóa còn bị ẩn cho chính tài khoản đang đăng nhập (`p.id !== user?.id`).
- Session hiện tại của bạn còn đang bị khóa ở route `/first-login-change-password`; theo `src/App.tsx`, khi còn `mustChangePassword = true` thì toàn bộ app sẽ bị ép về màn đổi mật khẩu, nên cũng không thể thấy đúng màn Cài đặt.
- Luồng “tạo nhân viên mới + tạo account” vẫn còn một chỗ báo lỗi mơ hồ trong `src/components/employees/EmployeeFormDialog.tsx`, nên dù edge function đã có xử lý tốt hơn, UI vẫn có thể báo sai/thiếu rõ ràng.

Kế hoạch cập nhật:

1. Đồng bộ quyền hiển thị tab Tài khoản với quyền backend
- Sửa `Settings.tsx` để tab `Tài khoản` không còn chỉ hiện cho `ADMIN` nếu backend đang cho `HCNS` / `HR_MANAGER` quản lý account.
- Nếu giữ hard-delete là thao tác nhạy cảm, sẽ tách:
  - `HCNS` / `HR_MANAGER`: thấy tab, tạo/reset/vô hiệu hóa
  - `ADMIN`: thấy thêm nút `Xóa hoàn toàn`

2. Làm nút xóa dễ thấy hơn
- Đổi từ icon-only sang nút/tooltip rõ chữ hơn trong cột thao tác, ví dụ “Xóa TK”.
- Giữ chặn xóa chính mình.
- Thêm mô tả ngay trên tab để phân biệt:
  - Vô hiệu hóa = khóa đăng nhập
  - Xóa hoàn toàn = chỉ dùng cho tài khoản test / lỗi

3. Sửa triệt để lỗi tạo mới
- Cập nhật cả `SettingsAccountsTab.tsx`, `EmployeeRoleTab.tsx` và `EmployeeFormDialog.tsx` dùng chung cách parse lỗi edge function.
- Hiển thị đúng lỗi server trả về như:
  - email đã tồn tại
  - không đủ quyền
  - liên kết employee/profile lỗi
- Sửa text thành đúng nghiệp vụ: tạo account bằng mật khẩu mặc định, không còn ghi sai là “email đặt mật khẩu sẽ được gửi tự động”.

4. Xử lý rõ trạng thái “đăng nhập lần đầu”
- Giữ rule ép đổi mật khẩu trước, nhưng bổ sung logic rõ hơn để sau khi đổi xong thì role/permission được nạp lại ổn định.
- Tránh tình trạng người dùng tưởng đang vào app quản trị nhưng thực tế vẫn bị gate bởi `must_change_password`.

5. Rà lại QA đúng luồng người dùng
- Test bằng tài khoản `ADMIN`: vào Cài đặt > Tài khoản, thấy nút xóa, tạo được tài khoản test, xóa được tài khoản test.
- Test bằng `HCNS` / `HR_MANAGER`: xác nhận có thấy tab Tài khoản hay không theo rule mới.
- Test case tự xóa chính mình: nút phải bị ẩn.
- Test sau khi đổi mật khẩu lần đầu: vào lại Settings không còn bị chặn.

File sẽ chỉnh
- `src/pages/Settings.tsx`
- `src/components/settings/SettingsAccountsTab.tsx`
- `src/components/employees/EmployeeRoleTab.tsx`
- `src/components/employees/EmployeeFormDialog.tsx`
- Nếu cần thêm siết quyền hiển thị/xóa theo role thì rà thêm `src/contexts/AuthContext.tsx` hoặc hook permission liên quan

Chi tiết kỹ thuật
- Hiện tại frontend đang lệch với backend:
  - Backend `manage-employee-accounts` cho `ADMIN`, `HCNS`, `HR_MANAGER`
  - Nhưng frontend chỉ cho `ADMIN` thấy tab account
- Đây là lý do rất lớn khiến bạn nói “làm gì có nút xóa”.
- Còn lỗi “không tạo được nhân viên mới” nhiều khả năng nằm ở chỗ form thêm nhân viên vẫn chưa parse đúng lỗi edge function ở luồng auto-create account.
