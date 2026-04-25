## 🎯 Mục tiêu
Tích hợp tính năng **In Phiếu Xác Nhận Booking** vào trang Chi tiết Booking, sử dụng template HTML V10 do anh đính kèm — giữ nguyên 100% giao diện in.

---

## 📐 Kiến trúc giải pháp

**Iframe + postMessage** — đặt template HTML nguyên bản tại `public/print/booking-confirmation.html`, React wrapper fetch data từ Supabase rồi gửi vào iframe qua `postMessage`. Native `window.print()` xuất A4.

**Lý do**: Giữ pixel-perfect bản V10 anh đã chốt, không cần port HTML/CSS sang JSX.

---

## 📁 Files triển khai

### Mới (3 files)

**1. `public/print/booking-confirmation.html`** — Copy nguyên file `SGH_XacNhan_V10.html` anh upload, chỉnh nhẹ:
- Bỏ `<div class="toolbar">` (đã có nút In trên React wrapper bên ngoài)
- Thêm `@page { size: A4; margin: 0 }` để loại header/footer browser
- Bổ sung `data-field` cho tất cả 24+ ô info card cả 2 tab (Tour lẻ + Tour đoàn): `cust_name`, `cust_phone`, `cust_pax`, `cust_staff`, `staff_phone`, `tour_name`, `tour_code`, `tour_start`, `tour_end`, `tour_duration`, `total`, `deposit`, `remaining`, `remaining_due`, `hold_deadline`, `grp_*` (group variant) v.v.
- Mở rộng `SGH_fillData(data)` để fill cả `data-field` của info card (không chỉ trường có sẵn)
- Listen `window.message` event → khi parent gửi `{ type:'fill', data:{...} }` → chạy `SGH_fillData(data)` + `SGH_setType(type)`
- Đọc `?type=le|doan` từ URL → auto switch tab + ẩn tab bar khi in
- Expose `window.toggleEdit()` để bật/tắt `contentEditable` cho class `.ef`

**2. `src/pages/BookingConfirmationPrint.tsx`** — Route `/dat-tour/:id/in-xac-nhan?type=le|doan` (NGOÀI AppLayout, không sidebar)

Layout:
- Sticky toolbar trên cùng: nút **🖨️ In PDF**, **✏️ Bật/tắt chỉnh sửa**, **← Quay lại**
- Iframe full-width chứa template

Logic:
- Fetch parallel: `bookings + customers join`, `quotations + tour_packages` (qua `quote_id`), `profiles` (qua `sale_id` lấy tên/sđt NV)
- **Permission check**:
  ```ts
  const canPrint = 
    ['ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN'].includes(role) ||
    booking.sale_id === user.id ||
    (['MANAGER','GDKD'].includes(role) && booking.department_id === userDept);
  ```
  Nếu không → toast lỗi + `navigate(-1)`
- Build `dataMap` rồi:
  ```ts
  iframe.onload = () => iframe.contentWindow.postMessage({ type:'fill', data: dataMap, printType }, '*');
  ```
- Booking đã COMPLETED/CANCELLED: vẫn cho in bình thường (anh đã chốt)

**3. `src/components/bookings/PrintConfirmationButton.tsx`** — Dropdown trên BookingDetail:
- "✈ Tour lẻ" → `window.open('/dat-tour/'+id+'/in-xac-nhan?type=le','_blank')`
- "🚌 Tour đoàn" → `?type=doan`
- Nút disabled (ẩn) nếu không có quyền in

### Sửa (2 files)

**4. `src/pages/BookingDetail.tsx`** — Thêm `<PrintConfirmationButton booking={booking} />` vào header (cạnh nút Quay lại)

**5. `src/App.tsx`** — Thêm route trong `<ProtectedRoutes>` NHƯNG ngoài `<Route element={<AppLayout />}>` (full-screen, không sidebar):
```tsx
<Route path="/dat-tour/:id/in-xac-nhan" element={
  <ErrorBoundary><BookingConfirmationPrint /></ErrorBoundary>
} />
```

---

## 🗺️ Mapping data → template

| `data-field` | Nguồn DB |
|---|---|
| `booking_code` / `grp_booking_code` | `bookings.code` |
| `cust_name` / `grp_leader` | `customers.full_name` (B2B fallback `contact_person`) |
| `cust_phone` | `customers.phone` (B2B: `contact_person_phone`) |
| `cust_email` | `customers.email` |
| `cust_id` | `customers.id_number` |
| `cust_pax` | `bookings.pax_total` + parse `pax_details` JSON → "X NL + Y TE + Z EB" |
| `staff_name_sb` / `cust_staff` | `profiles.full_name` (qua `bookings.sale_id`) |
| `staff_phone` | `profiles.phone` |
| `tour_name` / `grp_tour_name` | `tour_packages.name` |
| `tour_code` | `tour_packages.code` |
| `tour_duration` | `duration_days + duration_nights` → "5N4Đ" |
| `tour_start` / `tour_end` | `quotations.valid_from/until` (best-effort) |
| `total` | `bookings.total_value` (format `vi-VN` + " ₫") |
| `deposit` | `bookings.deposit_amount` |
| `remaining` | `bookings.remaining_amount` |
| `remaining_due` | `bookings.remaining_due_at` (DD/MM/YYYY) |
| `hold_deadline` | `bookings.created_at + 48h` |
| `bank_*`, flight info, visa | Để trống → Sale tự gõ contentEditable |

**Roster Tour Đoàn**: Để 20 dòng trống — Sale gõ trực tiếp.

---

## 🔐 Quyền in (đã chốt cuối)

| Role | Được in? |
|---|---|
| ADMIN, SUPER_ADMIN | ✅ Mọi booking |
| Sale phụ trách (`sale_id === user.id`) | ✅ Booking của mình |
| MANAGER, GDKD cùng phòng | ✅ Booking trong phòng |
| **DIEUHAN** | ✅ Mọi booking (đối chiếu làm tour) |
| **KETOAN** | ✅ Mọi booking (đối chiếu thu chi) |
| Sale khác phòng, INTERN, HCNS, MKT... | ❌ Không thấy nút |

---

## 💾 Lưu dữ liệu Sale gõ
**KHÔNG lưu DB** (anh đã chốt). Sale gõ contentEditable trên iframe → bấm In → xong. Tắt tab gõ lại lần sau.

---

## ⚠️ Lưu ý kỹ thuật
1. Iframe same-origin (`/print/...html` cùng domain) → `postMessage` + `contentWindow.print()` chạy được
2. Template `width:794px` = A4 @ 96dpi + `@page A4 margin:0` → vừa khít
3. Không port HTML sang JSX → giữ pixel-perfect 100%
4. Không cần migration DB
5. Booking COMPLETED/CANCELLED: vẫn in (chỉ là phiếu, không sửa data)

---

## 📋 Tasks sẽ tạo khi triển
1. Copy + chỉnh template V10 thành `public/print/booking-confirmation.html`
2. Tạo `BookingConfirmationPrint.tsx` (fetch + iframe + print + permission)
3. Tạo `PrintConfirmationButton.tsx` (dropdown chọn Tour lẻ/đoàn)
4. Sửa `BookingDetail.tsx` + `App.tsx`

Triển ngay khi được duyệt.