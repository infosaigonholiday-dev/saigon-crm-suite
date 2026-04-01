

## Dashboard KPI cho MANAGER + Báo cáo Tài chính

### Tổng quan
Hai phần việc: (1) Tạo dashboard KPI riêng cho MANAGER với dữ liệu theo phòng ban, (2) Thêm 5 tab báo cáo mới vào Finance.tsx với phân quyền theo role.

### Kế hoạch thực hiện

**1. ManagerKPIDashboard (`src/pages/ManagerKPIDashboard.tsx`)** — Component mới

- Query dữ liệu theo `department_id` từ `get_my_department_id()`:
  - `sale_targets` (filter department + tháng hiện tại) → tổng target_revenue vs actual_revenue
  - `bookings` (tháng này + department) → đếm + tổng doanh thu
  - `customers` (department) → đếm KH mới tháng
  - `leads` (department, status active) → tổng expected_value (pipeline)
  - `bookings` tháng trước → so sánh % tăng/giảm

- UI Cards:
  - a. Target doanh thu: Progress bar + % đạt
  - b. Booking mới tháng
  - c. KH mới tháng
  - d. Pipeline value

- Bảng xếp hạng Sale: query bookings group by sale_id, join profiles lấy tên → sort doanh thu giảm dần
- So sánh tháng trước: mũi tên xanh/đỏ kèm % thay đổi
- KHÔNG hiển thị: lợi nhuận, chi phí, dòng tiền, công nợ

**2. Dashboard.tsx** — Cập nhật routing

- Thêm type `"manager"` vào `getDashboardType`: khi role = MANAGER → return "manager"
- Import + render `ManagerKPIDashboard` khi type === "manager"

**3. Finance Reports — 5 tab mới trong Finance.tsx**

Tạo 5 component con:

- **`RevenueReportTab.tsx`**: BarChart doanh thu theo tháng từ `revenue_records`, filter năm. Bảng chi tiết bên dưới (tháng, booking_count, gross_revenue). Nhận prop `departmentFilter` để MANAGER chỉ thấy department mình.

- **`ProfitReportTab.tsx`**: 2 card (LN gộp = gross_revenue - tour_direct_cost, LN ròng = gross_revenue - total_opex) + LineChart trend 12 tháng từ `profit_loss_monthly`.

- **`CashflowReportTab.tsx`**: LineChart total_inflow vs total_outflow + net_cashflow từ `cashflow_monthly`. Card opening/closing balance.

- **`TaxReportTab.tsx`**: Bảng từ `tax_records`: period, vat_output, vat_input, vat_payable, cit_amount, status.

- **`DebtReportTab.tsx`**: 2 sub-tab:
  - Khách nợ: `accounts_receivable` join customers/bookings. Highlight đỏ nếu due_date < today && status != PAID.
  - Nợ NCC: `accounts_payable`. Tương tự highlight quá hạn.

**4. Finance.tsx** — Phân quyền tabs

- Dùng `useAuth()` lấy `userRole`
- Full tabs (tất cả 14 tabs): ADMIN, SUPER_ADMIN, DIRECTOR, KETOAN
- MANAGER: chỉ thấy tab "Doanh thu" (với filter department tự động)
- TabsList responsive: dùng overflow-x-auto thay vì grid-cols cố định

### Files thay đổi
- `src/pages/ManagerKPIDashboard.tsx` (mới)
- `src/hooks/useDashboardData.ts` (cập nhật getDashboardType)
- `src/pages/Dashboard.tsx` (thêm manager case)
- `src/components/finance/RevenueReportTab.tsx` (mới)
- `src/components/finance/ProfitReportTab.tsx` (mới)
- `src/components/finance/CashflowReportTab.tsx` (mới)
- `src/components/finance/TaxReportTab.tsx` (mới)
- `src/components/finance/DebtReportTab.tsx` (mới)
- `src/pages/Finance.tsx` (thêm tabs + phân quyền)

Không cần migration SQL — tất cả bảng dữ liệu đã tồn tại.

