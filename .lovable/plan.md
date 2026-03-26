

## Fix: Quên mật khẩu — thông báo thành công rồi quay về login

### Hiện tại
Sau gửi email thành công, dialog đóng ngay + toast nhỏ → người dùng dễ bỏ lỡ thông báo.

### Thay đổi

**File: `src/pages/Login.tsx`**

- Thêm state `forgotSent` (boolean)
- Sau gửi email thành công: set `forgotSent = true`, hiện màn hình xác nhận **trong dialog** (icon CheckCircle + "Đã gửi email thành công! Kiểm tra hộp thư để đặt lại mật khẩu.")
- Tự động đóng dialog sau **3 giây** và quay về form đăng nhập
- Khi dialog đóng (onOpenChange): reset `forgotSent` và `forgotEmail`

**File: `src/pages/ResetPassword.tsx`**

- Thêm timeout 8 giây cho trạng thái loading → nếu hết hạn hiện "Liên kết không hợp lệ" + nút "Quay về đăng nhập" (navigate `/login`)
- Sau đổi MK thành công: nút "Đăng nhập ngay" (navigate `/login`)

| File | Thay đổi |
|------|----------|
| `src/pages/Login.tsx` | Dialog quên MK: hiện xác nhận 3s rồi tự đóng |
| `src/pages/ResetPassword.tsx` | Timeout 8s + nút quay về login |

