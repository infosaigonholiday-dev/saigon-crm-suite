

## Kế hoạch tổng hợp: Tái cấu trúc Module Tài chính & Điều hành

### Hiện trạng

- **Finance.tsx**: Chỉ có 4 KPI cards + 1 biểu đồ bar từ `profit_loss_monthly` và `revenue_records`
- **Thư mục `src/components/finance/`**: Trống — chưa có component nào
- **Chưa có**: Trang Vendors, bảng `vendors`, `tour_services`, `transactions`, `marketing_expenses`, `other_expenses`
- **Plan file** `.lovable/plan.md`: Chỉ chứa kế hoạch HCNS cũ, cần ghi đè bằng kế hoạch tổng hợp

---

### Phần 1: Database Migration — 5 bảng mới

**Bảng `vendors`** — Danh bạ NCC
- name, category (TRANSPORT/HOTEL/RESTAURANT/MC/GUIDE/VISA/EVENT/OTHER), contact_phone, bank_account, bank_name, beneficiary, notes
- RLS: ADMIN, DIRECTOR, DIEUHAN, MANAGER, KETOAN

**Bảng `tour_services`** — Dự toán chi / Phiếu đặt dịch vụ
- booking_id (FK bookings), vendor_id (FK vendors), service_type, description, expected_cost, due_date, status (PENDING/CONFIRMED/COMPLETED), created_by, notes
- RLS: Đọc = ADMIN/DIRECTOR/DIEUHAN/MANAGER/KETOAN; Ghi = ADMIN/DIRECTOR/DIEUHAN/MANAGER

**Bảng `transactions`** — Sổ quỹ tổng hợp (Single Source of Truth)
- transaction_date, type (INCOME/EXPENSE), category (TOUR_REVENUE/TOUR_EXPENSE/SALARY/BHXH/OFFICE_RENT/UTILITIES/MARKETING/PHONE/PARKING/OTHER), amount, booking_id (nullable FK), vendor_id (nullable FK), tour_service_id (nullable FK), description, recorded_by, approved_by, approval_status (DRAFT/APPROVED/REJECTED), payment_method, reference_code, notes
- RLS: ADMIN/KETOAN/DIRECTOR full; DIEUHAN/MANAGER đọc TOUR_EXPENSE liên quan

**Bảng `marketing_expenses`** — Chi phí marketing
- category (ADS/CONTENT/OTA_COMMISSION/EVENT/OTHER), description, amount, expense_date, department_id, recorded_by, approved_by, notes
- RLS: ADMIN, KETOAN, DIRECTOR, MKT

**Bảng `other_expenses`** — Chi phí khác
- category (LEGAL/TRAINING/BANK_FEE/LICENSE/OTHER), description, amount, expense_date, department_id, recorded_by, approved_by, notes
- RLS: ADMIN, KETOAN, DIRECTOR

---

### Phần 2: Trang Vendors mới (`/nha-cung-cap`)

- Danh sách NCC với filter theo loại dịch vụ
- Form CRUD (VendorFormDialog)
- Permission: `bookings.view` (đọc), `bookings.edit` (ghi)
- Thêm route trong App.tsx, thêm mục sidebar

**Tệp tạo mới:**
- `src/pages/Vendors.tsx`
- `src/components/vendors/VendorFormDialog.tsx`

---

### Phần 3: Mở rộng BookingDetail — Tab "Dự toán chi"

- Thêm tab hiển thị `tour_services` của booking
- Điều hành thêm/sửa phiếu dịch vụ (chọn NCC từ dropdown vendors)
- Hiển thị: Tổng dự toán, Đã chi (sum từ transactions), Công nợ NCC

**Tệp tạo mới:**
- `src/components/bookings/BookingServicesTab.tsx`

**Tệp sửa:**
- `src/pages/BookingDetail.tsx` — thêm tab

---

### Phần 4: Tái cấu trúc Finance.tsx — 7 Tab

| Tab | Nguồn dữ liệu | Mô tả |
|---|---|---|
| Tổng quan | `profit_loss_monthly`, `revenue_records` | Giữ nguyên KPI + biểu đồ hiện tại |
| Sổ quỹ | `transactions` | Bảng thu/chi, form "Lập phiếu Thu/Chi", filter tháng |
| Chi phí lương | `payroll` | Tổng hợp gross/net/BHXH/thuế theo tháng |
| Chi phí văn phòng | `office_expenses` | Danh sách + form thêm mới |
| Chi phí Marketing | `marketing_expenses` | Danh sách + form thêm mới |
| Chi phí khác | `other_expenses` | Danh sách + form thêm mới |
| Tổng hợp OPEX | Tất cả bảng chi phí | Stacked bar chart 5 nhóm theo tháng |

**Tệp tạo mới:**
- `src/components/finance/TransactionFormDialog.tsx` — Form lập phiếu Thu/Chi (dropdown Mã Tour + NCC khi chọn category liên quan tour)
- `src/components/finance/TransactionListTab.tsx` — Tab Sổ quỹ
- `src/components/finance/SalaryCostTab.tsx` — Tab chi phí lương (query payroll group by tháng)
- `src/components/finance/ExpenseListTab.tsx` — Component dùng chung cho VP/MKT/Khác
- `src/components/finance/ExpenseFormDialog.tsx` — Form thêm chi phí dùng chung
- `src/components/finance/ExpenseSummaryTab.tsx` — Tab tổng hợp OPEX

**Tệp sửa:**
- `src/pages/Finance.tsx` — Refactor thành Tabs layout

---

### Phần 5: Cập nhật phân quyền & sidebar

**`src/hooks/usePermissions.ts`:**
- KETOAN thêm quyền truy cập transactions
- settings.view cho HCNS, HR_MANAGER, HR_HEAD

**`src/components/AppSidebar.tsx`:**
- Thêm mục "Nhà cung cấp" vào nhóm Kinh doanh

**`src/App.tsx`:**
- Thêm route `/nha-cung-cap`

**`src/pages/Settings.tsx`:**
- Refactor: permission-based thay vì hardcode isAdmin
- HR roles vào được tab Phòng ban + Cấp bậc

**`src/hooks/useDashboardData.ts`:**
- Thêm HR_HEAD vào HR_ROLES

**Migration DB bổ sung:**
- Cập nhật `get_default_permissions_for_role` thêm settings.view cho HR roles

---

### Phần 6: Cập nhật plan file

Ghi đè `.lovable/plan.md` bằng kế hoạch tổng hợp này.

---

### Tóm tắt tệp cần tạo/sửa

| Tệp | Hành động |
|---|---|
| Migration SQL | 5 bảng mới + RLS + cập nhật DB function |
| `src/pages/Vendors.tsx` | Tạo mới |
| `src/components/vendors/VendorFormDialog.tsx` | Tạo mới |
| `src/components/bookings/BookingServicesTab.tsx` | Tạo mới |
| `src/components/finance/TransactionFormDialog.tsx` | Tạo mới |
| `src/components/finance/TransactionListTab.tsx` | Tạo mới |
| `src/components/finance/SalaryCostTab.tsx` | Tạo mới |
| `src/components/finance/ExpenseListTab.tsx` | Tạo mới |
| `src/components/finance/ExpenseFormDialog.tsx` | Tạo mới |
| `src/components/finance/ExpenseSummaryTab.tsx` | Tạo mới |
| `src/pages/Finance.tsx` | Refactor → 7 tabs |
| `src/pages/BookingDetail.tsx` | Thêm tab Dự toán chi |
| `src/components/AppSidebar.tsx` | Thêm mục NCC |
| `src/App.tsx` | Thêm route /nha-cung-cap |
| `src/hooks/usePermissions.ts` | Cập nhật quyền |
| `src/hooks/useDashboardData.ts` | Thêm HR_HEAD |
| `src/pages/Settings.tsx` | Refactor permission-based |
| `.lovable/plan.md` | Ghi đè plan mới |

