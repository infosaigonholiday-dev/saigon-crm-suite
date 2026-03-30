
Mục tiêu: sửa triệt để lỗi “vẫn login thất bại” và dọn toàn bộ chỗ còn sót liên quan đến mật khẩu mặc định.

1. Xác định nguyên nhân chính
- Tôi đã kiểm tra dữ liệu thật: tài khoản `tienhcns.saigonholiday@gmail.com` có trong `profiles`, có trong `auth.users`, đã confirm email, không bị khóa, có password hash.
- Auth log hiện trả về `invalid_credentials`, nghĩa là form login đang chạy nhưng mật khẩu người dùng nhập không khớp với mật khẩu hiện tại trong Supabase.
- Vì vậy lỗi không phải do thiếu email/profile nữa, mà là do luồng tạo/reset tài khoản chưa giúp người dùng biết cách vào hệ thống sau khi ẩn mật khẩu mặc định.

2. Sửa luồng tài khoản để dùng được ngay
- Cập nhật `manage-employee-accounts` theo hướng an toàn nhưng khả dụng:
  - vẫn cho phép admin tạo/reset mật khẩu,
  - trả về thông điệp không lộ plaintext password,
  - bổ sung lựa chọn gửi email đặt mật khẩu hoặc gửi recovery link sau khi tạo/reset để nhân viên tự đặt mật khẩu.
- Nếu chưa muốn gửi email ngay, tối thiểu phải đổi copy trong UI để admin hiểu rõ: sau khi tạo/reset cần dùng chức năng “Quên mật khẩu” với đúng email đó để thiết lập mật khẩu mới.

3. Sửa các màn hình còn lộ hoặc gây hiểu nhầm
- `src/components/employees/EmployeeFormDialog.tsx`
  - bỏ toast `Đã tạo tài khoản đăng nhập (MK: sgh123456)`
  - bỏ mô tả còn hiển thị mật khẩu mặc định
  - thay bằng hướng dẫn an toàn: tài khoản được tạo, nhân viên dùng “Quên mật khẩu” để đặt mật khẩu
- `src/components/employees/EmployeeRoleTab.tsx`
  - bỏ 2 khối text còn lộ `sgh123456`
  - thay bằng trạng thái “Tài khoản đã tạo” + hướng dẫn gửi link khôi phục / quên mật khẩu
- `src/components/settings/SettingsAccountsTab.tsx`
  - giữ phần đã fix, nhưng bổ sung copy rõ hơn sau create/reset để tránh admin nghĩ có thể đăng nhập bằng mật khẩu không còn hiển thị.

4. Sửa warning React ở trang Login
- Console đang có warning `Function components cannot be given refs`.
- Nguồn gần nhất là `Login.tsx` khi render `Dialog`/toast stack trong route login.
- Tôi sẽ rà lại composition của `Dialog`, `Button asChild`, `AlertDialogAction asChild` và các component wrapper được dùng quanh login/reset để loại bỏ component không forwardRef đúng cách.
- Mục tiêu là xóa warning để tránh side effect ở form/dialog và làm login page ổn định hơn.

5. Cải thiện thông báo đăng nhập thất bại
- `src/pages/Login.tsx`
  - đổi message thân thiện hơn: “Sai email hoặc mật khẩu”
  - với tài khoản nhân viên mới/reset, thêm gợi ý ngay dưới toast hoặc helper text: “Nếu đây là tài khoản mới, hãy dùng Quên mật khẩu để đặt mật khẩu.”
- Việc này không sửa auth backend nhưng giúp người dùng thoát vòng lặp “nhập mật khẩu không đúng”.

6. Kiểm tra reset-password flow
- `src/pages/ResetPassword.tsx`
  - giữ route public như hiện tại,
  - rà lại điều kiện `ready/expired` để tránh false negative khi link recovery load chậm,
  - đảm bảo người dùng từ email recovery luôn vào được form đổi mật khẩu thay vì bị timeout sớm.

7. Kết quả sau khi triển khai
- Tài khoản đã tạo vẫn tồn tại và liên kết đúng với nhân viên.
- Hệ thống không còn lộ `sgh123456` trong UI/API.
- Admin có hướng dẫn đúng để cho nhân viên vào hệ thống.
- Người dùng mới/reset có thể vào bằng luồng “Quên mật khẩu” hoặc email recovery thay vì đoán mật khẩu.
- Warning ref ở login/dialog được xử lý.

Chi tiết kỹ thuật
- File cần sửa:
  - `supabase/functions/manage-employee-accounts/index.ts`
  - `src/pages/Login.tsx`
  - `src/pages/ResetPassword.tsx`
  - `src/components/employees/EmployeeFormDialog.tsx`
  - `src/components/employees/EmployeeRoleTab.tsx`
  - có thể thêm rà soát `src/components/ui/dialog.tsx` hoặc chỗ dùng `asChild` nếu warning xuất phát từ composition
- Dữ liệu thật đã xác nhận:
  - profile/auth user của `tienhcns.saigonholiday@gmail.com` tồn tại
  - `is_active = true`
  - `banned_until = null`
  - `last_sign_in_at = null`
  - lỗi hiện tại là `invalid_credentials`

Luồng đề xuất sau fix
```text
Admin tạo tài khoản
-> hệ thống liên kết employee + profile
-> không hiển thị mật khẩu
-> nhân viên dùng "Quên mật khẩu"
-> mở /reset-password từ email
-> tự đặt mật khẩu mới
-> đăng nhập bình thường
```
