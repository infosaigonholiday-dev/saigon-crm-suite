

# Scaffold Auth Email Templates cho Saigon Holiday

## Tổng quan

Thiết lập hệ thống email xác thực có thương hiệu Saigon Holiday, sử dụng domain `notify.app.saigonholiday.vn` đã cấu hình. DNS đang chờ xác minh nhưng không ảnh hưởng đến việc tạo templates -- email sẽ tự động hoạt động khi DNS verified.

## Các bước thực hiện

### Bước 1: Scaffold auth email templates
Tạo 6 email templates (signup, recovery, magic-link, invite, email-change, reauthentication) cùng edge function `auth-email-hook`.

### Bước 2: Áp dụng thương hiệu Saigon Holiday
Chỉnh sửa templates với:
- Màu chủ đạo cam `#E8963A` (primary từ CSS: hsl 30, 88%, 65%)
- Tên thương hiệu "Saigon Holiday"
- Font Arial, nền trắng #ffffff
- Button cam với chữ trắng, bo góc 8px

### Bước 3: Deploy edge function
Deploy `auth-email-hook` để kích hoạt hệ thống.

## Phạm vi ảnh hưởng

- Tạo mới: `supabase/functions/auth-email-hook/` và `supabase/functions/_shared/email-templates/`
- Cập nhật: `supabase/config.toml` (thêm cấu hình hook)
- Không thay đổi frontend, database, hay business logic hiện tại
- Email reset mật khẩu, xác minh email, magic link sẽ có giao diện thương hiệu Saigon Holiday

## Sau khi hoàn thành

- Theo dõi trạng thái DNS tại Cloud -> Emails
- Khi DNS verified, email sẽ tự động gửi từ `notify.app.saigonholiday.vn`

