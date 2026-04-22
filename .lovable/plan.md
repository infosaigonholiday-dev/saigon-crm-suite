

## Kế hoạch 4 Phase — Hoàn thiện module Kinh doanh

Plan này rất lớn. Tôi đề nghị chia làm 4 turn riêng để dễ test. Bạn approve plan này, tôi sẽ làm **Phase 1+2** trước (đây là phần Sale dùng hàng ngày). Phase 3 (Push) và Phase 4 (Notes) sẽ làm ở turn sau.

---

### PHASE 1 — Customer module + liên kết Lead↔KH

**1A. Fix convert Lead → Customer (đảm bảo copy đủ field)**

File `src/components/leads/ConvertToCustomerDialog.tsx`:
- Logic mapping HIỆN TẠI đã có đủ các field (`assigned_sale_id`, `source = channel`, `department_id`, `company_*`, `tax_code`, `company_size`, `tour_interest = destination || interest_type`, `type` auto theo `company_name`).
- Nguyên nhân "trống" thực sự: trigger `set_customer_department` ghi đè `department_id` dựa trên profile của `assigned_sale_id`. Không phải bug.
- **Hardening**: thêm `console.log` payload trước insert để debug; thêm `interest_type` vào notes nếu khác destination; trim chuỗi rỗng `""` thành `null`.

**1B. Bảng Khách hàng — thêm cột mới**

File `src/pages/Customers.tsx` — thêm các cột (giữ nguyên các cột hiện có):
- **Loại** (badge `B2B` tím / `Cá nhân` xám) — dựa trên `type`
- **Công ty** — `company_name` riêng cột
- **Ngày tạo** — `created_at` format dd/mm/yyyy

Cập nhật query select để fetch thêm `type, company_name, created_at`. Thứ tự cột mới:
```
Tên KH | Loại | Công ty | Sale phụ trách | Phòng | SĐT | Phân khúc | Nguồn | Bookings | Doanh thu | Đã TT | Ngày tạo | [Xóa]
```

**1C. CustomerDetail — section "Nguồn gốc"**

Đã có sẵn (file `CustomerDetail.tsx` line 220-257). Bổ sung:
- Thêm link "Xem Lead gốc →" click mở route `/tiem-nang?lead=<id>` (mở dialog detail) — hoặc nếu phức tạp thì hiển thị tooltip thông tin.
- Khi không có originLead: hiện text "Tạo trực tiếp (không qua Lead)" như hiện tại — OK.

---

### PHASE 2 — Kanban Lead card

**2A. Card hiện thêm thông tin** — `src/pages/Leads.tsx`

Card hiện đã có: tên, công ty, destination, phone, follow-up warning, NV, contact count, pax, budget, nút "→ KH", badge "Đã chuyển KH".

Thêm:
- **Badge "B2B"** (tím nhỏ) cạnh tên nếu có `company_name`
- **Dòng "Dự kiến đi: dd/mm/yyyy"** nếu `planned_travel_date` có giá trị
- Budget đã hiện sẵn → giữ nguyên

**2B. Card cột WON — nút nổi bật**

Hiện tại nút "→ KH" dùng `variant="outline"` size nhỏ. Đổi thành:
- `bg-green-600 hover:bg-green-700 text-white` full width, chữ to hơn (`text-xs h-7`)
- Label: "Chuyển thành KH →"
- Khi đã chuyển: badge "Đã chuyển KH ✓" + nút text-link "Xem KH →" navigate `/khach-hang/<converted_customer_id>`

**2C. Dropdown chọn WON — hỏi convert**

Logic đã có ở `Leads.tsx` line 372-384 (dropdown trong card kanban) và `LeadDetailDialog.tsx`. Đã tự động mở `ConvertToCustomerDialog` sau khi update WON. **Bổ sung**: thay vì auto-mở, hiện confirm dialog "Chuyển Lead này thành Khách hàng luôn?" với 2 nút "Chuyển ngay" / "Để sau" — dùng `window.confirm` để đơn giản hoặc tạo small AlertDialog.

---

### PHASE 3 — Web Push + Telegram (làm ở turn sau)

Sẽ triển khai khi Phase 1+2 đã chạy ổn:
- `public/sw.js` (service worker)
- `src/lib/pushNotification.ts` (registerPush)
- Migration: bảng `push_subscriptions` + cột `profiles.telegram_chat_id`
- Edge function `send-notification` (Web Push qua `web-push` lib + Telegram qua connector gateway)
- Tích hợp `registerPush` vào `AppLayout` sau login
- Settings: toggle Web Push / Telegram trong profile

**Cần user chuẩn bị**: VAPID keys (`npx web-push generate-vapid-keys`) → add vào Edge Function Secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) + `.env` (`VITE_VAPID_PUBLIC_KEY`).

Telegram: cần connect connector "Telegram" trước.

---

### PHASE 4 — Internal Notes (làm ở turn sau cùng)

- Migration: bảng `internal_notes` + RLS
- Component `InternalNotesTab` dùng chung
- Tích hợp vào tab thứ 6 trên LeadDetailDialog, CustomerDetail, BookingDetail
- Khi gửi note có mention → insert `notifications` + gọi edge function `send-notification`

---

### Files chỉnh sửa Phase 1+2 (turn này nếu approve)

1. `src/components/leads/ConvertToCustomerDialog.tsx` — hardening
2. `src/pages/Customers.tsx` — thêm 3 cột mới
3. `src/pages/CustomerDetail.tsx` — link "Xem Lead gốc"
4. `src/pages/Leads.tsx` — badge B2B, dòng planned date, nút convert nổi bật, confirm dialog WON

### Đề xuất thứ tự thực hiện

- **Turn 1 (sau khi approve)**: Phase 1 + Phase 2 → bạn test convert + kanban
- **Turn 2**: Phase 3 (yêu cầu bạn cung cấp VAPID keys + connect Telegram)
- **Turn 3**: Phase 4

Approve plan để tôi bắt đầu Phase 1+2.

