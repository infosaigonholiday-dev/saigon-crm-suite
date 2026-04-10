

## Kế hoạch: Deploy lại edge function và xác nhận UI

### Nguyên nhân gốc
- Code frontend (`SettingsAccountsTab.tsx`) **đã có** nút xóa (Trash2) và dialog xác nhận xóa.
- Edge function **đã có** action `delete_account`.
- Nhưng **edge function chưa được deploy lại** → bản đang chạy trên server là bản cũ, không có `delete_account`.
- Frontend preview cũng chưa reflect bản code mới → dialog vẫn hiện text cũ "Email đặt mật khẩu sẽ được gửi tự động".

### Hành động cần thực hiện

#### 1. Deploy lại edge function `manage-employee-accounts`
- Dùng tool deploy để push bản mới lên Supabase.
- Xác nhận bằng cách gọi thử action `delete_account` hoặc `create`.

#### 2. Xác nhận UI đã cập nhật
- Kiểm tra dialog tạo tài khoản hiển thị đúng mô tả mới.
- Kiểm tra nút Trash2 (xóa) hiện trong cột Thao tác.

#### 3. Test luồng tạo tài khoản
- Thử tạo tài khoản mới và xác nhận lỗi được parse đúng (không còn "non-2xx status code").

### Không cần thay đổi code
Code đã đúng và đầy đủ. Chỉ cần deploy edge function.

