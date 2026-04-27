## Vấn đề

Khi bấm **Booking** trong trang LKH Tour 2026 → mở dialog đặt tour → phiếu xác nhận in ra **KHÔNG có** mã tour, ngày đi, ngày về, giá.

## Nguyên nhân (đã verify)

1. **Định dạng ngày không khớp**:
   - `b2b_tours.departure_date` lưu kiểu **TEXT** dạng `"01/06/2026"` (DD/MM/YYYY).
   - `bookings.departure_date` là kiểu **DATE** cần `YYYY-MM-DD`.
   - `<input type="date">` cũng cần `YYYY-MM-DD`.
   - → Prefill chuyển string `"01/06/2026"` vào input → input rỗng → user save → DB nhận chuỗi sai → null hoặc lỗi → phiếu in trống ngày.

2. **Phiếu in (`BookingConfirmationPrint.tsx`) lấy ngày sai nguồn**:
   - `tour_start` lấy từ `quote?.valid_from`, `tour_end` lấy từ `quote?.valid_until`.
   - Booking từ LKH là `tour_source = "manual"` (không có quote) → 2 field này luôn rỗng.
   - Phải fallback `booking.departure_date` / `booking.return_date`.

3. **Mã tour trên phiếu chỉ lấy `tp.code`** (tour package). Booking từ LKH không có package → hiển thị `"—"`. Cần lưu thêm mã tour LKH vào booking và fallback hiển thị.

## Fix

### 1. `src/pages/Bookings.tsx` (đọc prefill)
Thêm helper `ddmmyyyyToISO()` chuyển `"01/06/2026"` → `"2026-06-01"` trước khi truyền vào `prefillData`. Đồng thời truyền thêm `tour_code` để lưu vào `tour_name_manual` dạng `"HẢI NAM 5N (HAIN5N-260601-01)"` hoặc lưu riêng vào `pax_details.tour_code` để phiếu in lấy được.

### 2. `src/components/bookings/BookingFormDialog.tsx`
- Đảm bảo prefill `departure_date` / `return_date` đã ở dạng ISO (do bước 1 đã chuyển).
- Khi save mutation: lưu `pax_details` thêm trường `tour_code` (mã LKH gốc) để phiếu in dùng.
- Tour name manual = `destination` + ` (` + `tour_code` + `)` để vừa hiện tên vừa hiện mã.

### 3. `src/pages/BookingConfirmationPrint.tsx`
Sửa mapping `dataMap`:
- `tour_start`: ưu tiên `booking.departure_date`, fallback `quote?.valid_from`.
- `tour_end`: ưu tiên `booking.return_date`, fallback `quote?.valid_until`.
- `tour_code`: ưu tiên `tp.code`, fallback `(booking.pax_details as any)?.tour_code`, cuối cùng `"—"`.
- `tour_duration`: nếu có `departure_date` + `return_date` → tính `N`/`Đ` từ chênh lệch ngày khi `tp.duration_days` rỗng.

### 4. Verify
- Build TS (`tsc --noEmit`) phải pass.
- Mở lại flow: LKH → Booking → Save → In phiếu → check 4 field: Mã tour, Ngày đi, Ngày về, Giá.

## Phạm vi

3 file:
- `src/pages/Bookings.tsx`
- `src/components/bookings/BookingFormDialog.tsx`
- `src/pages/BookingConfirmationPrint.tsx`

Không cần migration DB.
