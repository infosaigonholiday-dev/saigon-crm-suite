## Mục tiêu
Triển khai 2 phần đã chốt để khi chuyển sang build mode có thể làm trong một lượt:
1. Tính năng in Phiếu Xác Nhận Booking PDF từ Booking Detail bằng template V10 anh đã upload.
2. Sửa quyền module LKH Tour để toàn bộ nhân sự phòng Sale, Điều hành và Kế toán được xem và thao tác đúng vai trò.

Ngoài ra, chốt luôn tình trạng hiện tại của module Tài chính, MKT và hệ thống thông báo.

## Những gì đã xác nhận từ code hiện tại
- Template `SGH_XacNhan_V10.html` đã có đủ 2 tab `le` / `doan`, `SGH_fillData`, `SGH_setType`, `toggleEdit`, và `window.print()`.
- `BookingDetail.tsx` chưa có nút in phiếu.
- `App.tsx` chưa có route riêng cho trang in.
- `usePermissions.ts` hiện đã có `b2b_tours.view` cho các role sale, nhưng:
  - `DIEUHAN` chưa có `b2b_tours.view` / `b2b_tours.logs`
  - `KETOAN` chưa có `b2b_tours.view` / `b2b_tours.logs`
  - một số intern sale chưa đồng bộ `b2b_tours.view`
- `B2BTours.tsx` hiện cho thao tác xem chi tiết + tạo booking cho mọi người vào được tab catalog; tab `logs` chỉ hiện khi có `b2b_tours.logs`.
- Hệ thống thông báo hiện có cả 2 lớp:
  - In-app notification
  - Web Push đến thiết bị qua Service Worker + VAPID
  Nhưng web push chỉ hoạt động khi user đã bật trên thiết bị; iPhone/Safari cần Add to Home Screen.
- Module Tài chính đã triển khai khá đầy đủ ở `Finance.tsx`, bao gồm: tổng quan, duyệt HR, duyệt kế toán, sổ quỹ, dự toán, quyết toán, doanh thu, lợi nhuận, dòng tiền, thuế, công nợ, chi phí lương, văn phòng, marketing, khác, OPEX.
- Phần MKT đã có role và dữ liệu liên quan; trong tài chính đã có tab `CP Marketing` dùng `marketing_expenses`.

## Kế hoạch triển khai

### 1) Tích hợp Phiếu Xác Nhận Booking PDF
Tạo các phần sau:
- `public/print/booking-confirmation.html`
  - Copy từ file V10 anh upload
  - Bỏ toolbar gốc để dùng toolbar React bên ngoài
  - Thêm `@page { size: A4; margin: 0 }`
  - Thêm `message` listener để nhận dữ liệu từ app qua `postMessage`
  - Bổ sung `data-field` cho các ô info card và bảng giá đang còn trống để auto-fill tốt hơn
  - Giữ nguyên `toggleEdit`, `SGH_fillData`, `SGH_setType`
- `src/pages/BookingConfirmationPrint.tsx`
  - Route riêng `/dat-tour/:id/in-xac-nhan?type=le|doan`
  - Không dùng sidebar/AppLayout
  - Fetch `bookings`, `customers`, `profiles`, `quotations`, `tour_packages`
  - Map data sang template và bơm vào iframe bằng `postMessage`
  - Toolbar gồm: In PDF, Bật/tắt chỉnh sửa, Quay lại
  - Booking đã COMPLETED/CANCELLED vẫn được in
- `src/components/bookings/PrintConfirmationButton.tsx`
  - Nút dropdown trên trang Booking Detail
  - Mở tab mới theo loại phiếu: Tour lẻ / Tour đoàn
  - Quyền in: `ADMIN`, `SUPER_ADMIN`, `DIEUHAN`, `KETOAN`, sale phụ trách booking, và `MANAGER`/`GDKD` cùng phòng
- Sửa `src/pages/BookingDetail.tsx`
  - Gắn nút in vào header
- Sửa `src/App.tsx`
  - Thêm route trang in ngoài `AppLayout` nhưng vẫn nằm trong vùng yêu cầu đăng nhập

### 2) Sửa quyền module LKH Tour
Cập nhật quyền để “toàn bộ nhân sự phòng sale + phòng điều hành + kế toán được quyền xem và thao tác” theo đúng mặt bằng hiện tại của module:
- Trong `src/hooks/usePermissions.ts`
  - Thêm `b2b_tours.view` cho `DIEUHAN`, `KETOAN`, `INTERN_DIEUHAN`, `INTERN_KETOAN`
  - Thêm `b2b_tours.logs` cho `DIEUHAN`, `KETOAN`
  - Rà lại các role sale/intern sale để đảm bảo đồng bộ `b2b_tours.view`
- Tạo migration Supabase để đồng bộ hàm DB cấp quyền mặc định (`get_default_permissions_for_role`) với client permissions, tránh lệch client/server
- Không mở rộng route mới; `/b2b-tours` hiện đã bảo vệ bằng `PermissionGuard module="b2b_tours" action="view"`

### 3) Chốt trạng thái Tài chính, MKT và thông báo
Không cần build mới cho phần này nếu không có yêu cầu mở rộng thêm, vì code hiện tại đã cho thấy:
- Tài chính: đã triển khai giao diện và nhiều tab nghiệp vụ
- MKT: đã có role `MKT`, bảng `marketing_expenses`, tab chi phí marketing trong tài chính
- Thông báo: không chỉ là thông báo trong app; đã có web push đến thiết bị nếu bật quyền push

## Technical details

### Quyền in phiếu
```ts
const canPrint =
  ['ADMIN', 'SUPER_ADMIN', 'DIEUHAN', 'KETOAN'].includes(role) ||
  booking.sale_id === user.id ||
  (['MANAGER', 'GDKD'].includes(role) && booking.department_id === profile.department_id);
```

### Dữ liệu có thể map chắc chắn từ schema hiện tại
- Booking: `code`, `created_at`, `pax_total`, `pax_details`, `total_value`, `deposit_amount`, `remaining_amount`, `deposit_due_at`, `remaining_due_at`, `sale_id`, `department_id`
- Customer: `full_name`, `phone`, `email`, `id_number`, `contact_person`, `contact_person_phone`, `company_name`
- Profile: `full_name`, `phone`, `department_id`, `role`
- Quotation: `valid_from`, `valid_until`, `tour_package_id`
- Tour package: `name`, `code`, `duration_days`, `duration_nights`, `inclusions`, `exclusions`

### Giới hạn dữ liệu hiện tại
Các trường như chuyến bay thực tế, visa deadline chi tiết, roster hành khách, loại xe, phân bổ phòng chưa có nguồn dữ liệu chuẩn trong schema đang đọc. Những ô này sẽ để editable trực tiếp trên mẫu như anh đã chốt, không lưu DB.

### Kết quả sau khi triển khai
- Sale/Điều hành/Kế toán có thể vào LKH Tour theo đúng quyền mới
- Từ Booking Detail có thể mở tab in phiếu xác nhận, chỉnh tay các ô thiếu dữ liệu, rồi in PDF A4 native
- Tài chính/MKT/thông báo không cần xác minh lại về mặt tồn tại tính năng; chỉ cần mở rộng thêm nếu anh muốn thay đổi nghiệp vụ