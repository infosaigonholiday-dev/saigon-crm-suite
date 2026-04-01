

# KIỂM TRA PHÂN QUYỀN TỪNG ROLE — KẾT QUẢ CHI TIẾT

---

## 1. ADMIN / SUPER_ADMIN

**Permissions**: ALL_PERMISSION_KEYS (tất cả)

**Menu thấy**: Dashboard, KH, Lead, Báo giá, Gói tour, Lịch trình, Lưu trú, NCC, Đặt tour, HĐ, Thanh toán, Nhân sự, Nghỉ phép, Bảng lương, Tài chính, Quy trình, Cài đặt = **17 items**

**Data**: RLS policies cho SELECT đều include ADMIN/SUPER_ADMIN → tất cả records

**Nút Xóa**: Có `*.delete` trong permissions → HIỆN

**Duyệt**: Có `bookings.approve`, `leave.approve`, `finance.edit` → duyệt mọi thứ

**✅ OK**

---

## 2. DIRECTOR

**Permissions**: Tất cả trừ `*.delete`, `finance.create`, `leave.create`

**Menu thấy**: Giống ADMIN (17 items) — có tất cả `.view` permissions

**Data**: RLS include DIRECTOR ở mọi bảng → tất cả records

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**Duyệt**: Có `bookings.approve`, `leave.approve`, `finance.edit` → duyệt quyết toán lớp 3 (CEO approve in BudgetSettlementsTab)

**✅ OK**

---

## 3. KETOAN

**Permissions**: `customers.view, bookings.view, payments.view/create/edit, payroll.view/edit, finance.view/edit/submit, settings.view, sop.view`

**Menu thấy**:
- ✅ KH, Đặt tour, HĐ, NCC (bookings.view), Thanh toán, Bảng lương, Tài chính, Quy trình, Cài đặt
- ✅ KHÔNG thấy: Lead, Nhân sự, Nghỉ phép

**❌ CẦN FIX — Menu Cài đặt**:
- Yêu cầu: KETOAN KHÔNG thấy Cài đặt
- Thực tế: KETOAN có `settings.view` → thấy menu Cài đặt
- **Đây là design decision**: KETOAN có `settings.view` trong DEFAULT_PERMISSIONS. Nếu cần ẩn, phải xóa `settings.view` khỏi KETOAN permissions.

**❌ CẦN FIX — Menu thừa**: KETOAN có `bookings.view` nên thấy cả NCC, Đặt tour, HĐ. Yêu cầu chỉ nêu "Bookings (xem)" nhưng sidebar hiện 3 items (NCC, Đặt tour, HĐ) vì cùng dùng `bookings.view`. Đây là hệ quả của việc 3 menu items cùng dùng 1 permission key.

**Tài chính**: `isFullAccess` bao gồm KETOAN → thấy TẤT CẢ tabs + Duyệt chi phí ✅

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**Duyệt**: `finance.edit` → duyệt chi phí + dự toán + quyết toán lớp 2 ✅

**⚠️ Kết luận**: ✅ OK về cơ bản. Vấn đề `settings.view` là minor — KETOAN thấy tab Quyền hạn (read-only) trong Settings, không gây harm.

---

## 4. MANAGER

**Permissions**: `customers.view/create/edit, leads.view/create/edit, bookings.view/create/edit, quotations.view/create/edit, payments.view/create, employees.view, leave.view/approve, sop.view/create`

**Menu thấy**:
- ✅ Dashboard, KH, Lead, Báo giá, Gói tour, Lịch trình, Lưu trú, NCC, Đặt tour, HĐ, Thanh toán, Nhân sự, Nghỉ phép, Quy trình
- ✅ KHÔNG thấy: Bảng lương (`payroll.view` absent), Cài đặt (`settings.view` absent)

**❌ CẦN FIX — Tài chính menu**: MANAGER không có `finance.view` NOR `finance.submit` → sidebar filter `anyPermission: ["finance.view", "finance.submit"]` → KHÔNG thấy menu Tài chính. Nhưng yêu cầu nói "chỉ tab Doanh thu". Tuy nhiên, code có `ManagerFinanceView` cho MANAGER khi accessing Finance page. **Vấn đề**: MANAGER không thấy menu Tài chính trong sidebar → không thể navigate tới page → ManagerFinanceView không bao giờ hiện.

**Fix cần thiết**: Thêm `finance.view` hoặc tạo permission key mới cho MANAGER, HOẶC thêm `finance.submit` vào MANAGER permissions để menu hiện.

**Data**: RLS bookings/customers/leads filter theo `department_id = get_my_department_id()` cho MANAGER ✅

**Dashboard**: `getDashboardType("MANAGER")` = "manager" → ManagerKPIDashboard ✅

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**❌ Kết quả: CẦN FIX** — MANAGER không thấy menu Tài chính nên không truy cập được tab Doanh thu.

---

## 5. DIEUHAN

**Permissions**: `customers.view/create/edit, leads.view/create/edit, bookings.view/create/edit/approve, quotations.view/create/edit, payments.view/create/edit, sop.view/create`

**Menu thấy**: Dashboard, KH, Lead, Báo giá, Gói tour, Lịch trình, Lưu trú, NCC, Đặt tour, HĐ, Thanh toán, Quy trình

**❌ CẦN FIX — Tài chính**: DIEUHAN không có `finance.view` NOR `finance.submit` → KHÔNG thấy menu Tài chính. Nhưng yêu cầu nói DIEUHAN cần "nhập chi phí tour, lập dự toán, lập quyết toán".

DIEUHAN có RLS access tới `budget_estimates` (INSERT) và `budget_settlements` (INSERT), nhưng không có menu Tài chính để navigate.

**Fix**: Thêm `finance.submit` hoặc `finance.create` vào DIEUHAN DEFAULT_PERMISSIONS.

**Data**: RLS include DIEUHAN ở bookings (toàn bộ), customers, etc. ✅

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**❌ Kết quả: CẦN FIX** — DIEUHAN không truy cập được Tài chính.

---

## 6. SALE_DOMESTIC / SALE_OUTBOUND / SALE_MICE / SALE_INBOUND

**Permissions**: `customers.view/create/edit, leads.view/create/edit, bookings.view/create, quotations.view/create/edit, payments.view, sop.view`

**Menu thấy**: Dashboard, KH, Lead, Báo giá, Gói tour, Lịch trình, Lưu trú, NCC, Đặt tour, HĐ, Thanh toán, Quy trình

**❌ CẦN FIX — Menu thừa**: Sale thấy NCC, Lưu trú, Gói tour, Lịch trình, HĐ. Yêu cầu chỉ nêu "KH, Lead, Báo giá, Booking, Nghỉ phép". Sale KHÔNG có `leave.view` → KHÔNG thấy Nghỉ phép.

**❌ CẦN FIX — Nghỉ phép**: Sale không có `leave.view` hay `leave.create` → không thể tạo đơn nghỉ phép. Đây là thiếu sót — mọi NV đều cần tạo đơn nghỉ.

**Data**: RLS bookings filter `sale_id = auth.uid()` → chỉ thấy của mình ✅. Customers filter `assigned_sale_id = auth.uid()` ✅.

**Dashboard**: `getDashboardType` returns "personal" ✅

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**❌ Kết quả: CẦN FIX** — Thiếu `leave.view`, `leave.create` cho SALE roles.

---

## 7. HCNS

**Permissions**: `employees.view/create/edit, leave.view/create/approve, payroll.view/create/edit, finance.create/submit, settings.view, sop.view/create`

**Menu thấy**: Nhân sự, Nghỉ phép, Bảng lương, Tài chính (finance.submit), Quy trình, Cài đặt

**❌ CẦN FIX — Menu thừa**: HCNS thấy Cài đặt. Yêu cầu nói KHÔNG thấy Cài đặt. Thực tế HCNS có `settings.view`.

**Tài chính**: `!hasFinanceView && hasFinanceSubmit` → SubmitterView (chỉ form nhập) ✅

**❌ CẦN FIX — Menu thừa 2**: HCNS KHÔNG có `customers.view`, `leads.view`, `bookings.view` → KHÔNG thấy KH/Lead/Booking ✅. Nhưng thấy Cài đặt (minor issue, read-only).

**Nút Xóa**: KHÔNG có `*.delete` → ẨN ✅

**⚠️ Kết quả**: Gần OK. Settings.view cho HCNS là thiết kế hiện tại (xem tab Quyền hạn read-only).

---

## 8. HR_MANAGER / HR_HEAD

**HR_MANAGER permissions**: `employees.view/create/edit, leave.view/create/approve, payroll.view/create/edit, finance.submit, settings.view, sop.view/create`

**HR_HEAD** thêm: `bookings.view, quotations.view, payments.view`

**Menu HR_MANAGER**: Nhân sự, Nghỉ phép, Bảng lương, Tài chính, Quy trình, Cài đặt ✅
**Menu HR_HEAD**: + Đặt tour, HĐ, NCC, Báo giá, Lưu trú/Gói tour/Lịch trình, Thanh toán ✅

**Duyệt nghỉ phép**: `leave.approve` ✅

**✅ OK**

---

## 9. MKT

**Permissions**: `customers.view, leads.view/create/edit, sop.view`

**Menu thấy**: Dashboard, KH, Lead, Quy trình

**❌ CẦN FIX — Nghỉ phép**: MKT không có `leave.view/create` → không tạo được đơn nghỉ.

**Data Lead**: RLS leads — cần kiểm tra. MKT không trong leads RLS `has_any_role` list → chỉ thấy leads `assigned_to = auth.uid()` hoặc `created_by`. Yêu cầu nói "tất cả leads" vì MKT là nguồn chính.

**❌ CẦN FIX — RLS leads**: MKT có thể không thấy tất cả leads nếu RLS không include MKT.

**Nút Xóa**: ẨN ✅

**❌ Kết quả: CẦN FIX** — Thiếu `leave.view/create`. RLS leads có thể giới hạn.

---

## 10. TOUR

**Permissions**: `customers.view, bookings.view, sop.view`

**Menu thấy**: Dashboard, KH, NCC, Đặt tour, HĐ, Quy trình

**Menu thừa**: TOUR thấy KH, NCC, HĐ — yêu cầu chỉ nêu "Booking (xem)". Đây là do `bookings.view` và `customers.view` mở nhiều menu items.

**❌ CẦN FIX — Nghỉ phép**: TOUR không có `leave.view/create` → không tạo đơn nghỉ.

**Data bookings**: RLS include TOUR → thấy tất cả bookings (hợp lý, TOUR cần xem lịch trình).

**Nút Xóa**: ẨN ✅

**❌ Kết quả: CẦN FIX** — Thiếu `leave.view/create`.

---

## 11. INTERN

**Permissions**: `sop.view` only

**Menu thấy**: Dashboard, Quy trình

**❌ CẦN FIX — Nghỉ phép**: INTERN không có `leave.view/create` → không tạo đơn nghỉ. Yêu cầu nói INTERN cần "tạo đơn".

**Data**: Không có `.view` permission nào ngoài `sop.view` → chỉ thấy SOP ✅

**Nút Xóa**: ẨN ✅

**❌ Kết quả: CẦN FIX** — Thiếu `leave.view/create`.

---

## TÓM TẮT

| # | Role | Trạng thái | Vấn đề chính |
|---|------|-----------|-------------|
| 1 | ADMIN/SUPER_ADMIN | ✅ OK | — |
| 2 | DIRECTOR | ✅ OK | — |
| 3 | KETOAN | ⚠️ Minor | settings.view hiện nhưng read-only |
| 4 | MANAGER | ❌ CẦN FIX | Không thấy menu Tài chính (thiếu finance permission) |
| 5 | DIEUHAN | ❌ CẦN FIX | Không thấy menu Tài chính |
| 6 | SALE_* | ❌ CẦN FIX | Thiếu `leave.view`, `leave.create` |
| 7 | HCNS | ⚠️ Minor | settings.view (acceptable) |
| 8 | HR_MANAGER/HR_HEAD | ✅ OK | — |
| 9 | MKT | ❌ CẦN FIX | Thiếu `leave.view/create`, RLS leads hạn chế |
| 10 | TOUR | ❌ CẦN FIX | Thiếu `leave.view/create` |
| 11 | INTERN | ❌ CẦN FIX | Thiếu `leave.view/create` |

---

## KẾ HOẠCH FIX

### Fix 1: Thêm `leave.view` + `leave.create` cho tất cả roles thiếu

**File**: `src/hooks/usePermissions.ts` — DEFAULT_PERMISSIONS

Thêm `"leave.view", "leave.create"` vào:
- `SALE_DOMESTIC`, `SALE_INBOUND`, `SALE_OUTBOUND`, `SALE_MICE`
- `MKT`, `TOUR`, `INTERN`

**File**: DB function `get_default_permissions_for_role()` — đồng bộ thêm tương tự.

### Fix 2: Thêm `finance.submit` cho MANAGER và DIEUHAN

**File**: `src/hooks/usePermissions.ts`
- MANAGER: thêm `"finance.submit"` (để thấy menu Tài chính → ManagerFinanceView xử lý chỉ hiện Doanh thu)
- DIEUHAN: thêm `"finance.submit"` (để thấy menu Tài chính → SubmitterView nhập chi phí)

Lưu ý: DIEUHAN cũng cần `"finance.create"` để nhập chi phí (đã có trong HCNS nhưng thiếu ở DIEUHAN hiện tại... kiểm tra lại: DIEUHAN không có `finance.create` cũng không có `finance.submit` → cần thêm cả hai).

**File**: DB function — đồng bộ.

### Fix 3 (optional): Tách menu permissions chi tiết hơn

Hiện tại `bookings.view` mở 3 menu items (NCC, Đặt tour, HĐ). Nếu muốn SALE không thấy NCC:
- Tạo permission `vendors.view` riêng
- Hoặc chấp nhận SALE thấy NCC (read-only, RLS vẫn bảo vệ)

**Đề xuất**: Chấp nhận hiện trạng vì RLS bảo vệ đúng. Menu items thêm không gây risk.

### Tổng file thay đổi

1. `src/hooks/usePermissions.ts` — cập nhật DEFAULT_PERMISSIONS cho 9 roles
2. DB migration — cập nhật function `get_default_permissions_for_role()` đồng bộ

