
Bổ sung kế hoạch để xử lý đúng lỗi hiện tại:

### Vì sao vẫn lỗi dù là admin?

Có 2 luồng khác nhau đang bị hiểu lẫn nhau:

1. **“Vô hiệu hóa tài khoản”**
- Nút trong `SettingsAccountsTab` mở `DataHandoverDialog`.
- Với nhân viên này, dialog hiển thị **0 Leads / 0 Khách hàng**.
- Nhưng trong `DataHandoverDialog.tsx`, hàm `handleHandover()` vẫn đang chặn nếu `!newUserId`:
  - Nghĩa là **dù không có data cần bàn giao vẫn bắt chọn người nhận**.
  - Đây là lý do chính khiến bấm “Vô hiệu hóa” vẫn lỗi với case 0 data.

2. **“Xóa nhân viên”**
- Trang `Employees.tsx` và `EmployeeDetail.tsx` không xóa account/auth/profile.
- Nó chỉ **soft delete** bản ghi `employees` bằng `deleted_at`.
- Vì vậy admin **có quyền xóa hồ sơ nhân sự**, nhưng **không phải xóa hẳn tài khoản đăng nhập/profile**.
- Nếu profile đó là orphan hoặc vẫn còn liên kết account, thì “xóa nhân viên” không giải quyết triệt để vấn đề tài khoản.

3. **Case của nhân viên `operator1.saigonholiday@gmail.com`**
- Trước đó đã xác định đây là **orphan profile**: có `profiles` nhưng không có `auth.users`.
- Ngoài ra còn có migration đã tạo sẵn bản ghi `employees` liên kết với profile này.
- Nên hiện tại hệ thống đang ở trạng thái:
```text
employees record tồn tại
+ profiles record tồn tại
+ auth user không tồn tại
```
- Đây là lý do admin thấy rất “ngược đời”: nhìn như có tài khoản nhưng thực tế auth đã mất.

### Kế hoạch cập nhật

#### 1. Sửa `DataHandoverDialog.tsx` để cho phép vô hiệu hóa khi không có data bàn giao
- Đổi điều kiện validate:
```text
Nếu tổng leads + customers > 0 → bắt buộc chọn người nhận
Nếu tổng = 0 → cho phép gọi deactivate ngay, không cần newUserId
```
- Đồng thời đổi message/toast cho đúng case “chỉ vô hiệu hóa, không bàn giao”.

#### 2. Giữ Edge Function `manage-employee-accounts` theo hướng graceful cho orphan
- Action `deactivate` đã có fallback kiểm tra auth user.
- Cần đảm bảo frontend hiển thị warning rõ ràng nếu profile là orphan, nhưng vẫn xem là thành công khi `profiles.is_active = false` update được.

#### 3. Làm rõ khác biệt giữa “xóa nhân viên” và “vô hiệu hóa tài khoản”
- `Employees.tsx` / `EmployeeDetail.tsx`: hiện chỉ soft delete hồ sơ nhân viên.
- `SettingsAccountsTab.tsx` / `EmployeeRoleTab.tsx`: quản lý account/profile.
- Sẽ cập nhật wording UI để tránh hiểu nhầm:
  - “Xóa nhân viên” = ẩn hồ sơ nhân sự khỏi danh sách
  - “Vô hiệu hóa tài khoản” = chặn đăng nhập + ngưng quyền truy cập
- Nếu cần, thêm mô tả ngắn trong dialog hoặc tooltip.

#### 4. Bổ sung xử lý cho orphan profile sau khi vô hiệu hóa
- Với orphan như `operator1.saigonholiday@gmail.com`, sau khi deactivate được thì admin có 2 hướng:
  - `cleanup_orphans` để xóa profile lỗi
  - sau đó tạo lại tài khoản đúng chuẩn bằng cùng email
- Luồng này cần được ghi rõ hơn trong giao diện/toast để admin không bị mơ hồ.

#### 5. Rà lại khả năng “xóa hoàn toàn” về mặt nghiệp vụ
- Theo logic hiện tại của hệ thống, **không nên xóa hẳn tài khoản nhân viên đã từng hoạt động**, mà nên:
  - bàn giao dữ liệu
  - vô hiệu hóa account/profile
  - soft delete employee nếu cần ẩn hồ sơ
- Nếu user vẫn muốn có nút “xóa triệt để orphan account lỗi”, nên tách thành một action admin riêng, chỉ áp dụng cho profile lỗi/orphan, không dùng cho nhân viên bình thường.

### File dự kiến chỉnh
- `src/components/settings/DataHandoverDialog.tsx`
- có thể chỉnh thêm `src/components/settings/SettingsAccountsTab.tsx`
- có thể chỉnh thêm `src/components/employees/EmployeeRoleTab.tsx`
- nếu cần đồng bộ thông báo: `supabase/functions/manage-employee-accounts/index.ts`

### Kết quả mong đợi sau khi sửa
- Admin vẫn vô hiệu hóa được nhân viên **ngay cả khi 0 leads / 0 khách hàng**
- Orphan profile không còn làm flow bị kẹt
- “Xóa nhân viên” và “Vô hiệu hóa tài khoản” được tách nghĩa rõ ràng
- Sau đó admin có thể dọn orphan và tạo lại tài khoản trên cùng email nếu cần
