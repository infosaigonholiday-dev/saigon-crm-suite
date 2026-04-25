## Module "Kho Tour B2B" — Spec triển khai cuối

### A. Database (migration mới)

**Bảng `b2b_tours`** (catalog tour B2B):
- `id` uuid PK default `gen_random_uuid()`
- `tour_code`, `target_market`, `destination`, `thang`, `departure_date`, `flight_dep_code`, `flight_dep_time`, `return_date`, `flight_ret_code`, `flight_ret_time`: text
- `price_adl`, `price_chd`, `price_inf`, `commission_adl`, `commission_chd`, `commission_inf`: bigint
- `available_seats`, `hold_seats`, `notes`, `visa_deadline`: text
- `itinerary_url`: text NULLABLE
- `updated_at`: timestamptz default `now()`
- Index trên `tour_code`, `target_market`, `thang`

**Bảng `b2b_tour_logs`** (nhật ký hoạt động):
- `id` uuid PK default `gen_random_uuid()`
- `tour_code`: text
- `user_id`: uuid (default `auth.uid()` để tránh lỗi RLS)
- `user_name`: text
- `action`: text với CHECK IN (`'view_detail'`, `'download_itinerary'`, `'create_booking'`)
- `created_at`: timestamptz default `now()`
- Index trên `(user_id, created_at)`, `(tour_code, created_at)`

**RLS `b2b_tours`**:
- `SELECT TO authenticated USING (true)` — mọi user đăng nhập đều xem được
- INSERT/UPDATE/DELETE: chỉ ADMIN (qua `has_role(auth.uid(), 'ADMIN')`) — phase 2 sẽ làm UI quản lý

**RLS `b2b_tour_logs`**:
- INSERT TO authenticated: `user_id = auth.uid()`
- SELECT của chính mình: `user_id = auth.uid()`
- SELECT toàn bộ: ADMIN hoặc MANAGER (`has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','MANAGER','GDKD'])`)

### B. Permissions sync

**Thêm 2 permission keys mới** vào `src/hooks/usePermissions.ts` (`ALL_PERMISSION_KEYS`, `PERMISSION_GROUPS`):
- `b2b_tours.view` — xem catalog
- `b2b_tours.logs` — xem tab Nhật ký

**Default permissions** (cập nhật cả `DEFAULT_PERMISSIONS` ở client + DB function `get_default_permissions_for_role`):

| Role | `b2b_tours.view` | `b2b_tours.logs` |
|---|---|---|
| ADMIN, SUPER_ADMIN | ✅ | ✅ |
| GDKD, MANAGER | ✅ | ✅ |
| SALE_DOMESTIC, SALE_OUTBOUND, SALE_INBOUND, SALE_MICE | ✅ | ❌ |
| INTERN_SALE_DOMESTIC, INTERN_SALE_OUTBOUND, INTERN_SALE_INBOUND | ✅ | ❌ |
| INTERN_MKT | ✅ | ❌ |
| Còn lại (DIEUHAN, KETOAN, HCNS, HR_MANAGER, MKT, TOUR, INTERN_*…) | ❌ | ❌ |

(Lưu ý: INTERN_SALE_MICE KHÔNG nằm trong danh sách user gửi → không cấp quyền. Nếu muốn thêm sẽ confirm.)

### C. Sidebar (`src/components/AppSidebar.tsx`)

Thêm vào nhóm **"Kinh doanh"** ngay sau "Kho Data":
```ts
{ title: "Kho Tour B2B", url: "/b2b-tours", icon: Package, moduleKey: "b2b_tours" }
```
Icon `Package` (đã import sẵn). Hiển thị tự động nhờ `getVisibleModules()` đọc từ permissions.

### D. Trang `/b2b-tours` (`src/pages/B2BTours.tsx`)

Bọc bởi `<PermissionGuard module="b2b_tours" action="view">`.

**Layout**:
- Header + Tabs: "Catalog" (mọi role có quyền) | "Nhật ký" (chỉ render nếu có `b2b_tours.logs`)

**Tab Catalog**:
- 4 ô filter ngang (grid-cols-4): Select Thị trường (distinct `target_market`) | Select Điểm đến (filter cascading theo thị trường) | Select Tháng (distinct `thang`) | Input search `tour_code`
- Bảng 10 cột chính xác theo spec:
  1. Mã Tour
  2. Điểm đến
  3. Ngày đi + Giờ → `${departure_date} • ${flight_dep_time}` (format dd/MM)
  4. Ngày về + Giờ
  5. Giá ADL — `formatVND(price_adl)` (vd `19.990.000đ`)
  6. HH ADL — `Math.max(0, commission_adl - 200000)` rồi format VNĐ
  7. Còn nhận — Badge: green nếu >10, yellow 1–9, red =0 (parse `available_seats` thành số; nếu không phải số thì hiển thị raw)
  8. Giữ chỗ — Badge gray
  9. Hạn Visa — Badge orange nếu có, "—" nếu rỗng
  10. Action — 2 nút: "Xem chi tiết" (variant outline) + "Tạo Booking" (variant default/primary)
- Pagination 20/page (chuẩn project)
- KHÔNG hiện `flight_dep_code`/`flight_ret_code` trên bảng

**Tab Nhật ký** (chỉ ADMIN/MANAGER/GDKD):
- 3 summary cards phía trên: tổng `view_detail`, `download_itinerary`, `create_booking` trong tháng hiện tại
- Filter: Select Nhân viên (distinct `user_name`) + DateRange picker
- Bảng cột: Thời gian (`dd/MM HH:mm`) | Nhân viên | Mã Tour | Hành động (Badge):
  - `view_detail` → blue "Xem chi tiết"
  - `download_itinerary` → green "Tải lịch trình"
  - `create_booking` → purple "Tạo booking"
- Pagination 20/page

### E. Side Panel chi tiết (`src/components/b2b-tours/B2BTourDetailSheet.tsx`)

Dùng component `Sheet` (side="right", width ~480px).

**Khi mở**: insert log `action='view_detail'` (fire-and-forget, không block UI).

**3 sections**:

1. **Chuyến bay**
   - Bay đi: `${flight_dep_code} | ${flight_dep_time}` + `departure_date`
   - Bay về: `${flight_ret_code} | ${flight_ret_time}` + `return_date`

2. **Bảng giá đầy đủ** — 3 hàng x 3 cột (Loại | Giá | HH):
   - ADL: `price_adl` | `max(0, commission_adl - 200000)`
   - CHD: `price_chd` | `max(0, commission_chd - 200000)`
   - INF: `price_inf` | `max(0, commission_inf - 200000)`

3. **Thông tin khác**
   - Còn nhận, Giữ chỗ, Hạn Visa, Ghi chú (`notes` — pre-line)

**2 nút CTA dưới cùng**:
- **"Xem Lịch Trình Chi Tiết"** — `bg-green-600`, icon `FileText`
  - Nếu `itinerary_url`: log `download_itinerary` → `window.open(itinerary_url, '_blank')`
  - Nếu rỗng: nút disabled + Tooltip "Chưa có lịch trình — liên hệ điều hành để cập nhật"
- **"Tạo Booking"** — `bg-teal-600`, icon `CalendarPlus`
  - Log `create_booking` → `navigate('/dat-tour?prefill_tour=${tour_code}')`

### F. Booking integration

**Phương án (đã chốt theo Q1 trước)**: pre-fill bằng query param `?prefill_tour=`, không sửa schema bookings.

Sửa `src/pages/Bookings.tsx`:
- Đọc `prefill_tour` từ `useSearchParams`
- Nếu có → fetch tour từ `b2b_tours` theo `tour_code` → mở `BookingFormDialog` với prop `prefillData = { tour_code, destination, departure_date, price_adl }`

Sửa `src/components/bookings/BookingFormDialog.tsx`:
- Thêm prop optional `prefillData?: { tour_code; destination; departure_date; price_adl }`
- Khi có prefillData: hiển thị info box read-only màu xanh nhạt phía trên form ("Tạo từ tour B2B: [code] • [destination] • [date] • [price]")
- Pre-fill các field tương ứng trong form khi `defaultValues`

### G. Checklist file thay đổi

| File | Loại |
|---|---|
| `supabase/migrations/<timestamp>_b2b_tours.sql` | Mới (tables + RLS + update DB function) |
| `src/hooks/usePermissions.ts` | Sửa (thêm 2 keys + default permissions) |
| `src/pages/B2BTours.tsx` | Mới |
| `src/components/b2b-tours/B2BTourDetailSheet.tsx` | Mới |
| `src/components/b2b-tours/B2BTourLogsTab.tsx` | Mới (tách tab Nhật ký) |
| `src/components/AppSidebar.tsx` | Sửa (thêm menu item) |
| `src/App.tsx` | Sửa (thêm route `/b2b-tours`) |
| `src/pages/Bookings.tsx` | Sửa (đọc prefill_tour) |
| `src/components/bookings/BookingFormDialog.tsx` | Sửa (prop prefillData + info box) |

### H. Lưu ý

- **Catalog rỗng sau migration**: Phase 1 chỉ làm read UI. Data nhập sẽ làm phase 2 (form quản lý ADMIN) HOẶC import qua SQL Editor — báo trước để khỏi bất ngờ.
- **`available_seats`/`hold_seats`** là `text` theo spec (không phải số) → vẫn parse `parseInt` để áp logic badge color, fallback hiện raw nếu NaN.
- **Trade-off `?prefill_tour=`**: đơn giản, không tạo coupling DB. Nếu sau này cần báo cáo "booking từ tour B2B nào" sẽ thêm cột `b2b_tour_code` ở phase sau.

Sẵn sàng triển khai sau khi anh approve.