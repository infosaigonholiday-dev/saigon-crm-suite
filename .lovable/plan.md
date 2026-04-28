## Vấn đề

Phiếu xác nhận in từ Booking (tạo từ LKH) **không hiển thị**: Mã tour, Ngày đi, Ngày về, Lịch bay, Hạn visa, Điểm nổi bật — dù `b2b_tours` đã có đủ các trường.

## Nguyên nhân (đã verify)

1. **Template HTML** (`public/print/booking-confirmation.html`): các ô Chuyến bay (ĐI/VỀ), Hạn visa, danh sách Điểm nổi bật chỉ là `contenteditable` với `data-ph` (placeholder), **KHÔNG có `data-field`** → filler `SGH_fillData` không bao giờ inject dữ liệu.

2. **`BookingConfirmationPrint.tsx`**: chưa query `b2b_tours` qua `pax_details.tour_code` để lấy lịch bay/visa/notes (highlights).

3. **Filler JS**: chưa hỗ trợ key dạng list (UL nhiều `<li>` cho highlights).

## Schema sẵn có trong `b2b_tours`

`tour_code, destination, departure_date, return_date, flight_dep_code, flight_dep_time, flight_ret_code, flight_ret_time, visa_deadline, notes, price_adl, price_chd, price_inf` (toàn bộ kiểu TEXT, ngày ở dạng `DD/MM/YYYY`).

→ Không có cột `highlights` riêng → dùng `notes` (split theo xuống dòng / `;` / `•`).

## Fix

### 1. `public/print/booking-confirmation.html`
Thêm `data-field` vào các phần tử (cả 2 block: tour lẻ + tour đoàn):
- Hạn visa → `data-field="visa_deadline"`
- Flight ĐI → `data-field="flight_dep"`
- Flight VỀ → `data-field="flight_ret"`
- `<ul class="hl-list">` → `data-field="highlights_list"`

Cập nhật `SGH_fillData(data)`:
- Khi gặp key `highlights_list` (Array) → clear UL, render lại N `<li class="ef">` từ array.
- Các key text khác giữ logic cũ.

### 2. `src/pages/BookingConfirmationPrint.tsx`
- Thêm query `b2b_tours` theo `pax_details.tour_code` (chỉ chạy khi có tour_code, dùng `useQuery` enabled).
- Bổ sung field vào `dataMap`:
  - `flight_dep`: `${flight_dep_code} • ${flight_dep_time}` (bỏ qua nếu null).
  - `flight_ret`: `${flight_ret_code} • ${flight_ret_time}`.
  - `visa_deadline`: lấy từ b2b_tours.
  - `highlights_list`: parse `b2b_tours.notes` → split theo `\n`, `;`, `•`, `-` → trim, lọc rỗng, max 8 dòng. Nếu rỗng thì không gửi key (giữ placeholder).

### 3. Verify
- TS build pass.
- Mở booking từ LKH (Hải Nam 5N hoặc Lệ Giang 6N) → in phiếu → kiểm tra 4 vùng: Mã tour, Ngày đi/về, Lịch bay, Điểm nổi bật.

## Phạm vi

2 file: `public/print/booking-confirmation.html`, `src/pages/BookingConfirmationPrint.tsx`. Không cần migration DB.
