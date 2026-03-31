

## Sửa Edge Function + Reset tất cả tài khoản

### Yêu cầu
1. Khi tạo tài khoản mới: dùng mật khẩu mặc định `sgh123456` (đã có) + vẫn gửi recovery email (đã có) -- giữ nguyên logic hiện tại
2. Reset tất cả tài khoản nhân viên về mật khẩu `sgh123456` -- cần thực hiện

### Thay đổi

Hiện tại edge function đã đúng logic rồi -- tạo account với `DEFAULT_PASSWORD = "sgh123456"` và gửi recovery email. Không cần sửa code.

**Chỉ cần thực hiện 1 việc**: Gọi action `reset_all_passwords` qua edge function để reset tất cả tài khoản (bao gồm Lê Thị Thủy Tiên) về mật khẩu `sgh123456`.

Tôi sẽ dùng `supabase--curl_edge_functions` để gọi trực tiếp edge function với action `reset_all_passwords`.

### Không thay đổi UI
Theo yêu cầu, không cập nhật UI hiển thị mật khẩu mặc định.

### Files thay đổi
Không có file nào cần sửa. Chỉ cần gọi edge function một lần.

