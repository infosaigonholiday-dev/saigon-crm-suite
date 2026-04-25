## 🎯 Phạm vi & Hiện trạng

**Đã có sẵn (KHÔNG làm lại):**
- ✅ RLS Phần 1A/1B/1C/1D đã đúng (profit_loss/cost: chỉ ADMIN+KETOAN; revenue: GDKD theo dept; transactions: HCNS submitted_by; bookings UPDATE chặn closed)
- ✅ Audit log finance: trigger `log_finance_changes` đã gắn vào `budget_estimates`, `budget_settlements`, `transactions` (`trg_audit_*`)
- ✅ Notification trigger 7/12 sự kiện: submit DT/QT, approve/reject DT/QT, đóng booking, HCNS chi phí 2 lớp HR→KT (`notify_budget_estimate_change`, `notify_budget_settlement_change`, `notify_transaction_approval`)
- ✅ Form Dự toán + Quyết toán + KT duyệt (BudgetEstimatesTab, BudgetSettlementsTab, ApprovalTab)
- ✅ 5 tabs báo cáo: Revenue/Profit/Cashflow/Tax/Debt đã render
- ✅ Render theo role: GDKD → ManagerFinanceView (chỉ Doanh thu); HCNS → SubmitterView; CEO/KT → full
- ✅ HCNS nhập chi phí 2 lớp (PENDING_HR → PENDING_REVIEW → APPROVED) đã có
- ✅ Bảng `expense_categories` đã có 10 records + RLS
- ✅ InternalNotes đã tích hợp vào BudgetEstimates + Settlements (vừa làm xong)

**Cần làm (gap thực sự):**

---

## 📋 PHẦN A — DATABASE (1 migration)

### A1. Cảnh báo dòng tiền âm + công nợ quá hạn (Phần 3A + bảng cuối)
Thêm vào edge function `daily-reminders` (không cần DB).

### A2. Escalation 48h/72h (Phần 2G)
Thêm logic vào edge function `daily-reminders`:
- Query `budget_estimates` / `budget_settlements` có `status IN ('pending_review','pending_accountant')` AND `created_at < now() - 48h` → notify KETOAN
- `< now() - 72h` → notify ADMIN/SUPER_ADMIN
- Dùng cờ `last_reminder_at` (cần thêm cột) để tránh nhắc lặp

```sql
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
ALTER TABLE budget_settlements ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
```

### A3. RLS bổ sung HCNS có thể INSERT với approval_status = PENDING_HR (đã có nhưng cần kiểm)
Hiện tại `transactions_insert` cho phép `DRAFT, PENDING_REVIEW`. Cần thêm `PENDING_HR` vào danh sách (luồng 2 lớp).

```sql
DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'KETOAN')
  OR (submitted_by = auth.uid()
      AND approval_status IN ('DRAFT','PENDING_HR','PENDING_REVIEW')
      AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER']))
);
```

---

## 📋 PHẦN B — EDGE FUNCTION

### B1. Mở rộng `daily-reminders/index.ts`
Thêm 4 logic check chạy hàng ngày:

1. **Escalation 48h dự toán/quyết toán chưa duyệt** → KETOAN
2. **Escalation 72h** → ADMIN
3. **Công nợ KH > 30 ngày** (`accounts_receivable.due_date < now()-30d` AND `amount_remaining > 0`) → ADMIN
4. **Dòng tiền âm tháng hiện tại** (`SELECT inflow-outflow FROM cashflow_monthly WHERE year=current AND month=current`) → ADMIN

Mỗi notification: INSERT `notifications` + gọi `send-notification` (Web Push). Set `last_reminder_at` để tránh spam.

---

## 📋 PHẦN C — FRONTEND

### C1. Booking closed → ẩn nút Sửa + badge "Đã đóng — Chỉ CEO mở lại" (Phần 1D frontend)
- File: `src/pages/BookingDetail.tsx` + `src/components/bookings/BookingFormDialog.tsx`
- Nếu `booking.status === 'closed'` AND không phải ADMIN → disable nút Sửa, hiện badge cam

### C2. Banner cảnh báo chênh lệch >10% trong Quyết toán (Phần 2F)
- File: `src/components/finance/BudgetSettlementsTab.tsx`
- Trong dialog chi tiết settlement: tính max % chênh lệch của items, nếu > 10% → `<Alert variant="destructive">Chênh lệch vượt 10%</Alert>`

### C3. Auto-tính hoàn ứng/chi bù trong form Quyết toán (Phần 2C)
- Trong BudgetSettlementsTab form: đã có cột `refund_amount`, `topup_amount`, `refund_status`, `topup_status` → đảm bảo UI compute và hiển thị đầy đủ với badge trạng thái

### C4. Nút "Xuất CSV" trên 5 tab báo cáo (Phần 3C)
- Dùng `src/lib/exportUtils.ts` (đã có)
- Thêm vào: `RevenueReportTab`, `ProfitReportTab`, `CashflowReportTab`, `TaxReportTab`, `DebtReportTab`
- Chỉ hiện cho role có `finance.view`

### C5. Import Excel chi phí HCNS (Phần 4C)
- File mới: `src/components/finance/ImportExpensesDialog.tsx`
- Dùng `xlsx` (SheetJS) — đã có trong project
- Upload → parse → preview table → confirm → INSERT batch transactions với `approval_status='PENDING_HR'`
- Nút "Tải mẫu Excel": tạo file template với header [Ngày, Danh mục, Mô tả, Số tiền, Ghi chú]
- Gắn cạnh nút "Nhập chi phí" trong `SubmitterView` (Finance.tsx)

### C6. Duyệt hàng loạt chi phí (Phần 4D)
- File: `src/components/finance/ApprovalTab.tsx`
- Thêm checkbox đầu mỗi row + checkbox "Chọn tất cả"
- Nút "Duyệt tất cả đã chọn" → batch update
- Đếm + hiện badge số lượng chọn

### C7. Quản lý expense_categories trong Settings (Phần 4B)
- File mới: `src/components/settings/SettingsExpenseCategoriesTab.tsx`
- CRUD: tên + sort_order + is_active toggle
- Thêm tab vào `src/pages/Settings.tsx` (chỉ ADMIN)

### C8. Xuất PDF 3 biểu mẫu (Phần 5)
- File mới: `src/lib/financePrintTemplates.ts` — generate HTML
- File mới: `src/pages/FinancePrint.tsx` — route `/in-tai-chinh/:type/:id` (type: estimate/settlement/advance)
- Dùng `window.print()` (đã pattern sẵn ở `BookingConfirmationPrint.tsx`)
- Nút "🖨️ In phiếu" trong dialog chi tiết DT/QT → mở tab mới

---

## 📁 Files thay đổi

| File | Loại |
|---|---|
| Migration SQL | A2 (last_reminder_at), A3 (RLS transactions) |
| `supabase/functions/daily-reminders/index.ts` | B1 — 4 logic mới |
| `src/pages/BookingDetail.tsx` | C1 — disable nút sửa |
| `src/components/bookings/BookingFormDialog.tsx` | C1 — guard |
| `src/components/finance/BudgetSettlementsTab.tsx` | C2 + C3 — banner + auto-tính |
| `src/components/finance/RevenueReportTab.tsx` | C4 — CSV |
| `src/components/finance/ProfitReportTab.tsx` | C4 |
| `src/components/finance/CashflowReportTab.tsx` | C4 |
| `src/components/finance/TaxReportTab.tsx` | C4 |
| `src/components/finance/DebtReportTab.tsx` | C4 |
| `src/components/finance/ImportExpensesDialog.tsx` | C5 — MỚI |
| `src/pages/Finance.tsx` | C5 — gắn nút Import |
| `src/components/finance/ApprovalTab.tsx` | C6 — bulk approve |
| `src/components/settings/SettingsExpenseCategoriesTab.tsx` | C7 — MỚI |
| `src/pages/Settings.tsx` | C7 — thêm tab |
| `src/lib/financePrintTemplates.ts` | C8 — MỚI |
| `src/pages/FinancePrint.tsx` | C8 — MỚI |
| `src/App.tsx` | C8 — route mới |
| `src/components/finance/BudgetEstimatesTab.tsx` | C8 — nút In |

## ⚠️ Lưu ý quan trọng

1. **Không dùng html2pdf** — dùng `window.print()` để nhất quán với BookingConfirmationPrint
2. **Bulk approve** dùng `.in('id', ids)` 1 query, RLS đã cho phép KETOAN update
3. **Daily reminders** chạy 07:00 VN, đảm bảo không gửi trùng (check `last_reminder_at`)
4. **Import Excel**: validate strict — danh mục phải khớp `expense_categories.name`, số tiền phải > 0
5. **Banner chênh lệch >10%**: tính trên `settlement_items.estimated_amount` vs `actual_amount`

## ✅ Verify sau khi xong
- Tạo dự toán test → chờ 48h giả lập → trigger daily-reminders → KT nhận noti
- Import 5 dòng Excel → preview → submit → kiểm DB có 5 record PENDING_HR
- Bulk approve 3 dòng → status APPROVED + noti gửi 3 HCNS
- In phiếu DT → PDF có header logo + bảng + chữ ký 3 bên
- GDKD login → chỉ thấy "Doanh thu" + filter cố định dept
- Booking closed → Sale không thấy nút Sửa, ADMIN vẫn thấy

Anh duyệt thì em chạy hết trong 1 lần (ước ~16 file).