

## Vấn đề hiện tại

Mật khẩu tạm thời được tạo ngẫu nhiên và chỉ hiện 60 giây trên màn hình admin. Thực tế rất khó sử dụng vì:
- Admin dễ bỏ lỡ, không kịp ghi lại
- Không có cách nào xem lại sau 60s
- Nhân viên không biết mật khẩu để đăng nhập

## Giải pháp

Dùng mật khẩu mặc định `sgh123456` cho tất cả tài khoản mới. Sau khi đăng nhập lần đầu, nhân viên tự đổi mật khẩu. Đồng thời thêm tính năng "Quên mật khẩu" và trang đặt lại mật khẩu.

### Thay đổi cụ thể

| File | Thay đổi |
|------|----------|
| `supabase/functions/manage-employee-accounts/index.ts` | Bỏ `generatePassword()`, dùng mật khẩu cố định `sgh123456`. Trả về message thông báo thay vì `temp_password` |
| `src/components/employees/EmployeeRoleTab.tsx` | Bỏ logic hiển thị mật khẩu tạm 60s + countdown. Thay bằng thông báo đơn giản "Tài khoản đã tạo, mật khẩu mặc định: sgh123456". Thêm nút "Gửi email đặt lại mật khẩu" khi profile đã tồn tại |
| `src/pages/Login.tsx` | Thêm link/dialog "Quên mật khẩu" gọi `supabase.auth.resetPasswordForEmail()` |
| `src/pages/ResetPassword.tsx` | **Tạo mới** — Trang đặt mật khẩu mới khi nhận link từ email |
| `src/App.tsx` | Thêm route `/reset-password` (public) |

### Flow sau khi triển khai

```text
Admin tạo tài khoản NV → Mật khẩu mặc định: sgh123456
                        → Thông báo cho NV biết mật khẩu
NV đăng nhập lần đầu   → Dùng sgh123456
NV đổi mật khẩu        → Quên mật khẩu ở Login → Nhập email → Nhận link
                        → /reset-password → Đặt mật khẩu mới
```

### Lưu ý bảo mật

- Mật khẩu mặc định `sgh123456` chỉ là giải pháp nội bộ, phù hợp cho công ty nhỏ
- Nhân viên nên được yêu cầu đổi mật khẩu ngay sau lần đăng nhập đầu tiên
- Tính năng "Quên mật khẩu" cho phép reset qua email bất kỳ lúc nào

