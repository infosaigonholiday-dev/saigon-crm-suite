# Kế hoạch fix Booking + Phiếu xác nhận + Logo

## 1. Migration DB
- `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tour_name_manual text` — fallback khi không link quotation/tour_package.
- `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tour_package_id uuid REFERENCES tour_packages(id) ON DELETE SET NULL` — cho phép link trực tiếp gói tour không qua báo giá.

## 2. `BookingFormDialog.tsx` — bổ sung toàn diện

**Nguồn tour (radio 3 lựa chọn)**:
1. **Từ Báo giá** → dropdown `quotations` (lọc theo `customer_id` đã chọn nếu có; fallback all). Khi chọn → fetch quote + `tour_packages` join → auto-fill `tour_name_manual` (snapshot tên tour để hiển thị) + lưu `quote_id`.
2. **Từ Gói tour** → dropdown `tour_packages` (status=ACTIVE). Khi chọn → lưu `tour_package_id` + snapshot tên vào `tour_name_manual`.
3. **Nhập tay** → input text → lưu thẳng vào `tour_name_manual`.

**Pax chi tiết (3 input số)**:
- Người lớn (adults), Trẻ em (children), Em bé (infants).
- `pax_total = adults + children + infants` (auto-tính, readonly).
- Lưu `pax_details = { adults, children, infants }` (jsonb).

**Validation deposit**:
- Nếu `deposit_amount > total_value` → set error `"Tiền cọc không được vượt tổng giá trị"`, chặn submit.
- Hiện cả banner cảnh báo inline màu cam dưới ô nhập.

**Prefill từ B2B Tour 2026** (giữ logic cũ):
- Khi có `prefillData` → set `tour_name_manual` = destination, `total_value` = price_adl, không link quote/package.

## 3. `BookingConfirmationPrint.tsx` — chuỗi fallback tour name

Thay đoạn lấy `tp.name`:
```ts
const tourName =
  tp.name ||
  booking.tour_name_manual ||
  "[Chưa có thông tin tour]";
```
Áp dụng cho cả `tour_name`, `tour_name_v`, `grp_tour_name`. Tương tự `tour_code` → fallback "—".

Thêm query `tour_packages` riêng khi `booking.tour_package_id` có nhưng `quote_id` null.

## 4. Logo — kiểm toán & xác nhận

Đã rà soát: tất cả vị trí đều dùng đúng logo Saigon Holiday, **không có logo Lovable nào**:
- ✅ `src/components/AppSidebar.tsx` — dùng `@/assets/logo.jpg`
- ✅ `src/pages/Login.tsx` — dùng `@/assets/logo.jpg`
- ✅ `public/favicon.ico` — đã tồn tại (favicon hiện tại là của dự án)
- ✅ `public/print/booking-confirmation.html` — dùng SVG eagle inline + text "SAIGON HOLIDAY Travel" màu cam #F26522
- ⚠️ `index.html` `og:image` đang trỏ tới ảnh `gpt-engineer-file-uploads` (social card mặc định Lovable) → **sẽ thay** bằng `/favicon.ico` hoặc copy `logo.jpg` vào `public/og-image.jpg` rồi link.
- ⚠️ `public/placeholder.svg` (Lovable default) — chỉ dùng làm placeholder ảnh chung, không hiển thị ở UI chính → **giữ** (không gây ảnh hưởng).

**Hành động logo**:
- Copy `src/assets/logo.jpg` → `public/og-image.jpg`.
- Cập nhật `index.html`: `og:image` + `twitter:image` trỏ tới `/og-image.jpg` (đường dẫn tuyệt đối với domain).

## 5. Files chỉnh sửa

| File | Thay đổi |
|---|---|
| `supabase/migrations/...sql` (mới) | Thêm `tour_name_manual`, `tour_package_id` vào `bookings` |
| `src/components/bookings/BookingFormDialog.tsx` | Thêm radio nguồn tour, pax 3 input, validation deposit |
| `src/pages/BookingConfirmationPrint.tsx` | Fallback chain cho tên tour + query tour_package khi cần |
| `index.html` | Thay og:image + twitter:image |
| `public/og-image.jpg` (mới) | Copy từ `src/assets/logo.jpg` |

## 6. Test sau khi triển khai
1. Tạo booking mới → chọn quote → in phiếu → tên tour hiện đầy đủ.
2. Tạo booking mới → chọn tour_package trực tiếp → in → tên tour hiện đúng.
3. Tạo booking mới → nhập tay tour name → in → hiện đúng.
4. Booking cũ (quote_id null) → in → hiện "[Chưa có thông tin tour]" thay vì trống.
5. Nhập deposit > total → form chặn, hiện cảnh báo cam.
6. Pax: 2 NL + 1 TE + 1 EB → phiếu in hiện "2 NL + 1 TE + 1 EB".