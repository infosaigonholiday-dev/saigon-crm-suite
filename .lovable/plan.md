Mục tiêu: sửa đúng lỗi form Tạo booking hiện chưa tự điền đủ dữ liệu và chưa tự tính theo số lượng khách.

Kế hoạch triển khai

1. Sửa nguồn dữ liệu auto-fill cho form Booking
- Luồng từ LKH Tour 2026 (`prefill_tour`) sẽ lấy đủ: `destination`, `departure_date`, `return_date`, `price_adl`, `price_chd`, `price_inf`.
- Luồng từ Báo giá sẽ dùng đúng trường `quotations.total_amount` (hiện code đang đọc nhầm `total_value`, nên không tự điền tiền).
- Khi chọn Báo giá, form sẽ tự điền thêm:
  - tên tour
  - ngày đi = `valid_from`
  - ngày về = `valid_until`
  - tổng tiền ban đầu = `total_amount`
- Khi chọn Gói tour, form sẽ tự điền tên tour; nếu có dữ liệu giá nền (`base_price`) thì dùng làm giá người lớn mặc định.

2. Thêm công thức tự tính khi nhập số lượng khách
- Bổ sung state giá theo từng loại khách trong `BookingFormDialog`:
  - người lớn
  - trẻ em
  - em bé
- Tự tính live:
  - `paxTotal = adults + children + infants`
  - `total_value = adults*price_adl + children*price_chd + infants*price_inf`
- Hiển thị rõ bảng giá và tổng tính tự động ngay trong form để người dùng thấy công thức đang chạy.
- Giữ khả năng chỉnh tay nếu cần, nhưng mặc định phải tự nhảy đúng khi đổi số lượng.

3. Bổ sung các trường tự điền còn thiếu trong UI
- Thêm/hiển thị rõ các trường:
  - Tên tour hiển thị
  - Ngày đi
  - Ngày về
  - Giá NL / TE / EB
  - Tổng khách (auto)
  - Tổng giá trị (auto)
- Với nguồn manual, cho nhập tay ngày đi/ngày về.
- Với nguồn B2B và Báo giá, các trường này được prefill sẵn nhưng vẫn cho phép sửa.

4. Lưu đúng dữ liệu vào bảng `bookings`
- Khi submit, payload sẽ lưu cả:
  - `departure_date`
  - `return_date`
  - `tour_name_manual`
  - `pax_details`
  - `pax_total`
  - `total_value`
- Hiện tại code chưa insert `departure_date`/`return_date`, nên sẽ bổ sung để trang chi tiết và phiếu xác nhận đọc được dữ liệu thật.

5. Đồng bộ hiển thị sau khi tạo booking
- Đảm bảo `BookingDetail` hiện đúng ngày đi/ngày về vừa lưu.
- Đảm bảo `BookingConfirmationPrint` lấy được:
  - tên tour
  - ngày đi/ngày về
  - số khách từ `pax_details`
  - tổng tiền
- Luồng từ B2B tour phải hết tình trạng tạo xong mà phiếu in báo `[Chưa có thông tin tour]` hoặc thiếu ngày.

6. Verify sau fix
- Test 3 luồng:
  1. Tạo booking từ LKH Tour 2026
  2. Tạo booking từ Báo giá
  3. Tạo booking nhập tay
- Xác nhận các điểm sau:
  - nhập số lượng khách thì tổng tự nhảy
  - ngày đi/ngày về tự điền đúng khi có nguồn dữ liệu
  - tên tour tự điền đúng
  - record mới trong `bookings` có đủ `departure_date`, `return_date`, `tour_name_manual`, `pax_details`, `total_value`
  - trang chi tiết và phiếu xác nhận hiển thị đúng

Vấn đề đã xác nhận
- `BookingFormDialog` hiện chỉ auto tính `Tổng khách`, chưa có công thức tự tính `Tổng giá trị`.
- Luồng Báo giá đang query sai trường: code đọc `total_value` nhưng bảng `quotations` thực tế có `total_amount`.
- Form tạo booking hiện không insert `departure_date` và `return_date` dù cột DB đã tồn tại.
- Luồng `prefill_tour` từ bảng `b2b_tours` mới lấy `departure_date` và `price_adl`, chưa lấy `return_date`, `price_chd`, `price_inf`.
- Dữ liệu mẫu mới nhất trong DB cho thấy booking vừa tạo vẫn đang thiếu `departure_date` và `return_date`.

Chi tiết kỹ thuật
- File chính cần sửa:
  - `src/components/bookings/BookingFormDialog.tsx`
  - `src/pages/Bookings.tsx`
  - có thể rà lại `src/pages/BookingConfirmationPrint.tsx` nếu cần đồng bộ fallback hiển thị
- Không cần tạo bảng mới.
- Không cần migration mới nếu chỉ sửa logic form và payload insert, vì cột `departure_date` và `return_date` đã có sẵn trong DB.