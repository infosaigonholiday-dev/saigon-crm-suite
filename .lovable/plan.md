
# Kế hoạch tổng — gộp 2 việc

> Tôi gộp fix nhỏ "cột Lý do" + đại tu Module Tài chính vào 1 đợt triển khai duy nhất để tránh đụng nhau khi sửa song song.

---

## PHẦN 0 — FIX UI Cột "Lý do" (LeaveManagement.tsx)

**File:** `src/pages/LeaveManagement.tsx`

- Cột Lý do trong cả 2 bảng (My Requests + Team Requests):
  - `max-w-[150px] truncate` → `max-w-[320px]`
  - Thay `truncate` bằng `line-clamp-2` (2 dòng)
  - Thêm `title={r.reason}` để hover hiện full
  - Wrap trong `<p className="line-clamp-2 whitespace-pre-wrap break-words">`

```tsx
<TableCell className="max-w-[320px] text-sm align-top">
  <p className="line-clamp-2 whitespace-pre-wrap break-words" title={r.reason ?? ""}>
    {r.reason ?? "—"}
  </p>
</TableCell>
```

- Tiện thể nới cột "Nhân viên" (`max-w-[140px]`) và "Phòng ban" (`max-w-[120px]`) cho dễ đọc.

---

# MODULE TÀI CHÍNH — TRIỂN KHAI TOÀN DIỆN

## PHẦN 1 — RLS + Bảo mật

### 1A. `profit_loss_monthly`, `cost_records`
- DROP toàn bộ policy SELECT cũ, tạo lại:
  - `SELECT`: chỉ `ADMIN`, `SUPER_ADMIN`, `KETOAN` (qua `has_any_role`).
  - `INSERT/UPDATE/DELETE`: chỉ ADMIN + KETOAN.
- GDKD/MANAGER **không có quyền SELECT** (kể cả nhánh mình).

### 1B. `revenue_records`
- `SELECT`:
  - ADMIN/SUPER_ADMIN/KETOAN: all
  - GDKD/MANAGER: `department_id = get_my_department_id()`
  - SALE_*: `sale_id = auth.uid()` (giữ scoping cá nhân)

### 1C. `transactions`
- HCNS/HR_MANAGER:
  - `INSERT` được, **trigger BEFORE INSERT** ép `approval_status = 'pending_approval'`, `submitted_by = auth.uid()`.
  - `SELECT` chỉ rows `submitted_by = auth.uid()`.
- KETOAN/ADMIN: SELECT + UPDATE all.
- DIEUHAN/GDKD: SELECT theo scope booking liên quan (giữ nguyên hiện tại).

### 1D. Booking closed → khóa UPDATE
- Sửa mọi UPDATE policy của `bookings`:
  ```sql
  USING ((status != 'closed') OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
  ```
- Áp tương tự cho `payments`, `budget_estimates`, `budget_settlements`, `transactions` khi booking_id liên kết tới booking đã closed.
- **Frontend**: thêm hook `useBookingLocked(bookingId)` → ẩn nút Sửa, hiện badge `🔒 Đã đóng — Chỉ CEO mở lại` ở:
  - `BookingDetail.tsx`
  - `BookingFormDialog`, `PaymentFormDialog`, `BudgetEstimatesTab`, `BudgetSettlementsTab`

### 1E. Audit log tài chính
- Tạo 3 trigger function (clone pattern `log_customers_changes`):
  - `log_budget_estimates_changes`
  - `log_budget_settlements_changes`
  - `log_transactions_changes`
- Ghi: user_id, role, full_name, table_name, record_id, action, old_data, new_data, changed_fields, change_summary.
- Bind `AFTER INSERT/UPDATE/DELETE`.

---

## PHẦN 2 — Dự toán + Quyết toán

### 2A. Form Dự toán (Điều hành)
- Component mới: `src/components/finance/BudgetEstimateFormDialog.tsx`
- Trường: chọn `booking_id` (autocomplete), thêm nhiều `budget_estimate_items`:
  - category (enum: Xe, KS, Ăn uống, Vé, HDV, Bảo hiểm, Phát sinh)
  - description, unit_price, quantity, total (auto = unit*qty), expected_supplier, payment_deadline
- Phần tạm ứng (advance): amount, recipient, purpose → lưu vào cột mới trên `budget_estimates`:
  - Migration: thêm `advance_amount numeric DEFAULT 0`, `advance_recipient text`, `advance_purpose text`, `review_note text`, `reviewed_by uuid`, `reviewed_at timestamptz` nếu chưa có.
- Submit → `status = 'pending_review'` + insert `notifications` cho mọi KETOAN + gọi `send-notification` Edge Function.

### 2B. KETOAN duyệt dự toán
- Tab mới `Dự toán chờ duyệt` trong `Finance.tsx` (visible khi role ∈ ADMIN/KETOAN).
- Action:
  - **Duyệt chi & Tạm ứng**: `status='approved'`, tạo record `transactions` loại `ADVANCE` link tới booking + estimate.
  - **Từ chối**: dialog nhập `review_note` → `status='rejected'`.
- Notification gửi `created_by` của estimate.

### 2C. Form Quyết toán (Điều hành, sau tour)
- Component: `src/components/finance/BudgetSettlementFormDialog.tsx`
- Tạo từ estimate đã approved → button "Tạo quyết toán từ dự toán" copy items vào `settlement_items` (đã có `estimated_amount`, thêm `actual_amount`, `variance`, `variance_pct`, `evidence_url`).
- Bảng so sánh inline: Hạng mục | Dự toán | Thực chi | Chênh lệch | % | Upload chứng từ (storage bucket mới `finance-evidence`, private).
- Hoàn ứng/chi bù — auto compute trên `budget_settlements`:
  - Migration: `refund_amount numeric`, `topup_amount numeric`, `refund_status text DEFAULT 'pending'`, `topup_status text DEFAULT 'pending'`.
- Submit → `status='pending_accountant'` → notify KETOAN.

### 2D. KT duyệt quyết toán
- Action **Duyệt** → `status='pending_ceo'` → notify ADMIN/SUPER_ADMIN.
- Action **Từ chối** → `review_note` → trả lại Điều hành.

### 2E. CEO duyệt cuối + đóng booking
- Action **Duyệt & Đóng**:
  - Update settlement `status='closed'`.
  - Update booking `status='closed'`.
  - Insert `cost_records` từ settlement_items để vào báo cáo lợi nhuận.
- Notify Điều hành + KETOAN.
- Sau closed → RLS 1D chặn mọi UPDATE.

### 2F. Banner cảnh báo chênh lệch >10%
- Trong `BudgetSettlementsTab` & view CEO: nếu bất kỳ item có `abs(variance_pct) > 10` → banner đỏ liệt kê các item lệch.

### 2G. Deadline duyệt 48h/72h
- Mở rộng Edge Function `daily-reminders/index.ts`:
  - Sau 48h `pending_review` / `pending_accountant` chưa duyệt → notify + push KETOAN.
  - Sau 72h → escalate ADMIN.

---

## PHẦN 3 — Dashboard báo cáo (Finance.tsx, 5 tab)

### 3A. Render theo role
```ts
const role = userRole;
const isCeoOrAcc = ['ADMIN','SUPER_ADMIN','KETOAN'].includes(role);
const isHr = ['HCNS','HR_MANAGER'].includes(role);
const isGdkd = role === 'GDKD';
```
- HCNS/HR_MANAGER: chỉ thấy "Nhập chi phí" + "Chi phí của tôi" (Phần 4).
- GDKD: chỉ tab "Doanh thu" (filter cố định nhánh).
- ADMIN/SUPER_ADMIN/KETOAN: full 5 tab + tab "Dự toán chờ duyệt" + "Chờ duyệt chi phí".

### 3B. 5 tab + chi tiết
- **Doanh thu**: Recharts BarChart theo tháng, filter năm + nhánh + sale; bảng chi tiết.
- **Lợi nhuận gộp**: query `profit_loss_monthly` + group theo tour/nhánh.
- **Lợi nhuận ròng**: từ `profit_loss_monthly.net_profit` theo tháng/năm.
- **Dòng tiền**: LineChart inflow/outflow + net cashflow 12 tháng. Net < 0 → tô đỏ + insert notification CEO.
- **Công nợ**: 2 sub-tab
  - KH nợ (`accounts_receivable`): tên KH, mã booking, còn nợ, hạn TT, ngày quá hạn. Quá hạn >30d → row đỏ, daily-reminders push CEO.
  - Nợ NCC (`accounts_payable`): tương tự.

### 3C. Xuất CSV
- Tạo `src/lib/exportUtils.ts` đã có `exportToCSV` — tái sử dụng. Mỗi tab có nút "Xuất CSV" (chỉ hiện khi `hasPermission('finance','view')`).

---

## PHẦN 4 — HCNS nhập chi phí (2 lớp duyệt)

### 4A. Bảng `expense_categories` (mới)
```sql
CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
INSERT INTO expense_categories (name, sort_order) VALUES
  ('Văn phòng phẩm',1),('Điện nước',2),('Thuê văn phòng',3),
  ('Marketing / Quảng cáo',4),('Tiếp khách',5),('Lương',6),
  ('BHXH / BHYT / BHTN',7),('Phí dịch vụ',8),('Vận chuyển',9),('Khác',99);
```
- RLS: SELECT cho mọi role có `finance.view` hoặc HCNS/HR_MANAGER. INSERT/UPDATE/DELETE chỉ ADMIN.
- Tab quản lý trong `Settings` cho ADMIN.

### 4B. UI HCNS trong Finance.tsx
- 2 phần:
  - **Form Nhập chi phí**: dropdown category, amount, description, upload chứng từ (bucket `finance-evidence`), submit → INSERT `transactions` với `approval_status='pending_hr'`, `submitted_by=auth.uid()`.
  - **Bảng Chi phí tôi đã nhập**: list `transactions` của user, badge trạng thái.

### 4C. Import Excel
- Nút "Import Excel" + "Tải mẫu Excel" (template .xlsx có sẵn columns: Ngày, Danh mục, Số tiền, Mô tả).
- Dùng `xlsx` package — parse → preview Dialog → confirm → INSERT batch.

### 4D. Luồng duyệt 2 lớp
- Mở rộng `transactions.approval_status` enum: `pending_hr` → `pending_accountant` → `approved` / `rejected`.
- HR_MANAGER: tab "Chờ duyệt chi phí HCNS" → duyệt → `pending_accountant` → notify KETOAN.
- KETOAN: tab "Chờ duyệt chi phí" → duyệt → `approved` → notify HCNS gốc; hoặc `rejected` + lý do.
- Hỗ trợ duyệt hàng loạt (checkbox + nút "Duyệt đã chọn").
- Badge đỏ trên tab hiện count pending.

---

## PHẦN 5 — Biểu mẫu PDF

- Dùng `jspdf` + `jspdf-autotable` (đã hoặc sẽ thêm).
- File mới: `src/lib/pdf/financeForms.ts` xuất 3 hàm:
  - `exportEstimatePDF(estimate)` — Phiếu Dự toán
  - `exportSettlementPDF(settlement)` — Phiếu Quyết toán (có cột so sánh + hoàn ứng/chi bù)
  - `exportAdvancePDF(advance)` — Phiếu Tạm ứng
- Header: logo + "CÔNG TY DU LỊCH SAIGON HOLIDAY", footer chữ ký 3 người.
- Nút "Xuất PDF" trên detail dialog mỗi loại.

---

## PHẦN 6 — Notification & Web Push (đầy đủ ma trận)

Tạo trigger DB + bổ sung trong code submit/approve. Mỗi sự kiện:
1. INSERT vào `notifications` (priority='high' với cảnh báo, 'normal' còn lại).
2. PERFORM `net.http_post` tới Edge Function `send-notification` (giống pattern `notify_leave_request_change`).

Ma trận trigger:
| Sự kiện | Trigger nguồn | Recipient |
|---|---|---|
| DH submit DT | `budget_estimates` AFTER INSERT/UPDATE status→pending_review | KETOAN+ADMIN |
| KT duyệt/từ chối DT | `budget_estimates` UPDATE status | created_by |
| DH submit QT | `budget_settlements` UPDATE status→pending_accountant | KETOAN |
| KT duyệt QT | UPDATE status→pending_ceo | ADMIN/SUPER_ADMIN |
| CEO đóng booking | UPDATE status→closed | created_by + KETOAN |
| HCNS nhập CP | `transactions` INSERT pending_hr | HR_MANAGER |
| HR duyệt CP | UPDATE pending_accountant | KETOAN |
| KT duyệt/từ chối CP | UPDATE approved/rejected | submitted_by |
| DT/QT chờ 48h | daily-reminders cron | KETOAN |
| DT/QT chờ 72h | daily-reminders cron | ADMIN |
| Công nợ KH > 30d | daily-reminders cron | ADMIN |
| Dòng tiền âm | daily-reminders cron | ADMIN |

---

## PHẦN 7 — Permissions & Scoping cập nhật

- `PermissionsContext.tsx`:
  - HCNS: `finance: "personal"`.
  - HR_MANAGER: `finance: "department"` (chỉ HCNS staff).
  - KETOAN, ADMIN, SUPER_ADMIN: `finance: "all"`.
  - GDKD/MANAGER: `finance: "department"` nhưng chỉ tab Doanh thu.
- `usePermissions.ts` DEFAULT_PERMISSIONS:
  - HCNS thêm: `finance.view, finance.create, finance.submit`.
  - HR_MANAGER thêm: `finance.approve` (lớp 1).
  - GDKD: chỉ `finance.view`.

---

## Migration tổng (1 file)

Sẽ gồm:
1. Cột bổ sung `budget_estimates`, `budget_settlements` (advance_*, refund_*, topup_*, review_*).
2. Bảng `expense_categories` + seed.
3. Trigger ép `pending_hr` cho HCNS INSERT transactions.
4. RLS rewrite cho `profit_loss_monthly`, `cost_records`, `revenue_records`, `transactions`, `bookings`.
5. Trigger audit cho 3 bảng tài chính.
6. Trigger `notify_budget_estimate_change`, `notify_budget_settlement_change`, `notify_transaction_change` (clone pattern leave_request).
7. Storage bucket `finance-evidence` + RLS (private, owner + KETOAN/ADMIN read).

---

## Files mới / sửa (tóm tắt)

**Sửa:**
- `src/pages/LeaveManagement.tsx` (Phần 0)
- `src/pages/Finance.tsx` (gate role + tab mới)
- `src/contexts/PermissionsContext.tsx`
- `src/hooks/usePermissions.ts`
- `src/components/finance/BudgetEstimatesTab.tsx`
- `src/components/finance/BudgetSettlementsTab.tsx`
- `src/components/finance/TransactionListTab.tsx`
- `src/components/finance/ApprovalTab.tsx`
- `supabase/functions/daily-reminders/index.ts`

**Tạo mới:**
- `src/components/finance/BudgetEstimateFormDialog.tsx`
- `src/components/finance/BudgetSettlementFormDialog.tsx`
- `src/components/finance/HcnsExpenseForm.tsx`
- `src/components/finance/HcnsExpenseImportDialog.tsx`
- `src/components/finance/PendingEstimatesTab.tsx`
- `src/components/finance/PendingHrExpensesTab.tsx`
- `src/components/finance/PendingAccountantExpensesTab.tsx`
- `src/components/finance/ClosedBookingBadge.tsx`
- `src/components/settings/SettingsExpenseCategoriesTab.tsx`
- `src/lib/pdf/financeForms.ts`
- `src/hooks/useBookingLocked.ts`
- 1 SQL migration tổng.

---

## Rủi ro & xử lý

- **RLS mới có thể chặn nhầm**: sau khi apply, tôi smoke-test bằng `supabase--read_query` với từng role trước khi báo done.
- **Booking closed lock**: cần migration cẩn thận để không khóa booking đang chạy (chỉ áp `status='closed'` thôi).
- **Edge Function `send-notification` tải tăng**: gói batch trong trigger — đã có pattern `BEGIN…EXCEPTION WHEN OTHERS THEN NULL` để không fail trigger.
- **Lượng work lớn → tôi chạy tuần tự theo Phần 0 → 1 → 4 → 2 → 3 → 5 → 6**, mỗi phần test xong mới sang phần kế.

Duyệt thì tôi chạy.
