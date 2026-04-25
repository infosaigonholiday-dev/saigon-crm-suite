## 🎯 Mục tiêu

1. Thêm **nút in nhanh 🖨️** vào bảng danh sách Booking (cột Thao tác mới)
2. **Centralize** label module → đổi tên 1 lần áp dụng mọi nơi (chống lặp lại lỗi "Kho Tour B2B" sót)
3. **Helper dùng chung** kiểm quyền in phiếu xác nhận booking
4. Bỏ qua: Read-only mode & ghi log truy cập (theo chỉ đạo)

---

## 📋 Chi tiết triển khai

### 1. Helper dùng chung — `src/lib/bookingPrintAccess.ts` (MỚI)

Hàm thuần `canPrintBookingConfirmation({ userRole, userId, myDeptId, booking })`:
- `ADMIN`, `SUPER_ADMIN`, `KETOAN`, `DIEUHAN` → luôn được in
- Sale phụ trách (`booking.sale_id === userId`) → được in
- `MANAGER` / `GDKD` cùng phòng (`booking.department_id === myDeptId`) → được in
- Còn lại → KHÔNG được in (Sale khác phòng, Sale không phụ trách → ẩn nút)

→ Refactor `PrintConfirmationButton.tsx` và `BookingConfirmationPrint.tsx` để dùng helper này.

---

### 2. Nút in nhanh ở bảng Booking — `src/pages/Bookings.tsx`

- Thêm cột **"Thao tác"** ở cuối bảng
- Mỗi dòng: `DropdownMenu` với trigger là icon 🖨️ (`<Printer className="h-4 w-4" />`)
- Click → 2 lựa chọn:
  - ✈ Tour lẻ → mở `/dat-tour/:id/in-xac-nhan?type=le` (tab mới)
  - 🚌 Tour đoàn → mở `/dat-tour/:id/in-xac-nhan?type=doan` (tab mới)
- `e.stopPropagation()` để không trigger navigate vào BookingDetail
- Chỉ hiển thị khi `canPrintBookingConfirmation(...)` === true (dùng helper)
- Thêm field `sale_id` và `department_id` vào query select của bookings list (hiện chưa fetch)
- Fetch `myDeptId` qua `useMyDepartmentId(true)` để check quyền MANAGER/GDKD

**Tinh chỉnh UX:**
- Dùng `<TooltipProvider>` cho icon (tooltip "In phiếu xác nhận")
- Cột rộng cố định ~80px, căn giữa

---

### 3. Centralize Module Labels — `src/lib/moduleLabels.ts` (MỚI)

```ts
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
  customers: "Khách hàng",
  leads: "Tiềm năng",
  raw_contacts: "Kho Data",
  quotations: "Báo giá",
  bookings: "Đặt tour",
  payments: "Thanh toán",
  contracts: "Hợp đồng",
  tour_packages: "Gói tour",
  itineraries: "Lịch trình",
  accommodations: "Lưu trú",
  suppliers: "Nhà cung cấp",
  b2b_tours: "LKH Tour 2026", // ← single source of truth
  staff: "Nhân sự",
  leave: "Nghỉ phép",
  payroll: "Lương",
  finance: "Tài chính",
  workflow: "Quy trình",
  settings: "Cài đặt",
};

export const getModuleLabel = (key: string): string =>
  MODULE_LABELS[key] ?? key;
```

**Refactor để dùng:**
- `src/hooks/usePermissions.ts` — function `getModuleLabel()` hoặc array `MODULE_GROUPS` import từ đây thay vì hard-code chuỗi
- `src/components/AppSidebar.tsx` — nếu có hard-code "LKH Tour 2026" → dùng `getModuleLabel('b2b_tours')`
- (Không đụng route URL `/kho-tour-b2b` và DB key `b2b_tours` — giữ nguyên cho ổn định)

---

### 4. Files thay đổi (tổng kết)

**Tạo mới:**
- `src/lib/moduleLabels.ts`
- `src/lib/bookingPrintAccess.ts`

**Chỉnh sửa:**
- `src/pages/Bookings.tsx` — thêm cột Thao tác + nút in nhanh + fetch sale_id/department_id + check quyền
- `src/components/bookings/PrintConfirmationButton.tsx` — refactor dùng `canPrintBookingConfirmation`
- `src/pages/BookingConfirmationPrint.tsx` — refactor dùng `canPrintBookingConfirmation`
- `src/hooks/usePermissions.ts` — label `b2b_tours` lấy từ `getModuleLabel`
- (Tuỳ tình hình kiểm tra) `src/components/AppSidebar.tsx`

---

## ✅ Acceptance Criteria

- [ ] Bảng Bookings: cột Thao tác hiện icon 🖨️ — chỉ user có quyền in mới thấy
- [ ] Click icon → dropdown 2 lựa chọn → mở tab mới sang trang in chính xác
- [ ] Click icon KHÔNG navigate vào BookingDetail (stopPropagation OK)
- [ ] Sale khác phòng / không phụ trách → KHÔNG thấy icon
- [ ] DIEUHAN, KETOAN, ADMIN → thấy icon mọi booking
- [ ] MANAGER/GDKD → thấy icon với booking thuộc phòng mình
- [ ] Đổi label `b2b_tours` trong `moduleLabels.ts` → tự động áp dụng ở Settings > Quyền hạn (không phải tìm sửa nhiều file)
- [ ] `tsc` build sạch, không lỗi TS
