

# KẾT QUẢ KIỂM TRA UI/UX VÀ LUỒNG NGHIỆP VỤ

## A. MODULE KHÁCH HÀNG

**1. Form thêm KH có 2 tabs (Cá nhân + Doanh nghiệp)?**
✅ OK — `CustomerFormDialog.tsx` có `TabsList` với 2 tab: "Thông tin cá nhân" và "Thông tin doanh nghiệp".

**2. Tab Cá nhân đầy đủ trường?**
✅ OK — Có: họ tên, SĐT, email, ngày sinh, giới tính, CCCD/Passport, địa chỉ, nguồn đến (từ lead_sources), ghi chú. Thêm: loại KH, phân khúc, sale phụ trách.

**3. Tab Doanh nghiệp đầy đủ trường?**
✅ OK — Có: tên công ty, MST (validate 10 số), địa chỉ công ty, người liên hệ, chức vụ, ngày sinh người LH, email công ty, ngày thành lập, quy mô nhân sự.

**4. Badge tier hiển thị trên danh sách?**
✅ OK — `Customers.tsx` hiển thị `tierBadgeConfig` (Silver/Gold/Diamond) + loyalty badge cạnh tên KH.

**5. Nhắc sinh nhật hiển thị trên PersonalDashboard?**
✅ OK — `PersonalDashboard.tsx` có card "Sự kiện sắp tới" query customers theo `assigned_sale_id`, check `date_of_birth`, `contact_birthday`, `founded_date` trong 7 ngày.

---

## B. MODULE LEAD

**6. Kanban card hiển thị temperature icon, budget, destination, follow_up_date?**
✅ OK — Card có: temperature icon (🔥/🟠/🔵), destination với MapPin, budget/expected_value, follow-up status.

**7. Card follow_up quá hạn/hôm nay → visual highlight?**
✅ OK — `borderClass`: quá hạn/hôm nay → `border-l-red-500`, hot lead → `border-l-orange-400`. Text cảnh báo "Quá hạn!" / "Follow-up hôm nay!".

**8. Nút "Chuyển thành Khách hàng"?**
✅ OK — `convertToCustomer` mutation: tạo customer, update lead `status='WON'` và `customer_id`. Nút hiển thị ở column QUOTED/QUALIFIED khi chưa có `customer_id`.

**9. Form thêm Lead đầy đủ trường mới?**
✅ OK — `LeadFormDialog.tsx` có: budget, destination, pax_count, temperature, follow_up_date (calendar picker), call_notes + các trường cơ bản.

---

## C. MODULE TÀI CHÍNH

**10. Tab "Duyệt chi phí"?**
✅ OK — `ApprovalTab.tsx`: danh sách PENDING_REVIEW, checkbox batch select, nút Duyệt/Từ chối (dialog reject với lý do), filter theo category/submitter/date.

**11. Role HCNS chỉ thấy form nhập + danh sách "tôi đã nhập"?**
✅ OK — `Finance.tsx` line 216: `if (!hasFinanceView && hasFinanceSubmit) return <SubmitterView />` — chỉ render `TransactionListTab submitterOnly`. Không thấy báo cáo.

**12. Tab "Dự toán"?**
✅ OK — `BudgetEstimatesTab.tsx` tồn tại, render trong Finance.tsx. Điều hành tạo, Kế toán duyệt + tạm ứng.

**13. Tab "Quyết toán" — so sánh dự toán vs thực chi, 3 lớp duyệt?**
✅ OK — `BudgetSettlementsTab.tsx`: flow `draft → pending_accountant → pending_ceo → closed`. Có `accountantApproveMutation`, `ceoApproveMutation`, `rejectMutation`. Load estimate items để so sánh.

**14. CEO duyệt quyết toán → booking status='COMPLETED'?**
✅ OK — `ceoApproveMutation` (line 221-231): update settlement `status='closed'` rồi `bookings.update({ status: 'COMPLETED' })`.

**15. Tab "Doanh thu" — biểu đồ + filter?**
✅ OK — `RevenueReportTab.tsx`: BarChart theo tháng, dropdown chọn năm, hỗ trợ `departmentFilter` prop.

**16. Tab "Lợi nhuận" — LN gộp + LN ròng, trend chart?**
✅ OK — `ProfitReportTab.tsx`: LineChart với 2 lines (grossProfit, netProfit), hiển thị tổng LN gộp + LN ròng.

**17. Tab "Dòng tiền" — inflow vs outflow?**
✅ OK — `CashflowReportTab.tsx`: LineChart 3 lines (inflow, outflow, net). Hiển thị closing balance.

**18. Tab "Thuế VAT" — bảng vat_output, vat_input, vat_payable?**
✅ OK — `TaxReportTab.tsx`: Table với columns VAT đầu ra, VAT đầu vào, VAT phải nộp, Thuế TNDN.

**19. Tab "Công nợ" — 2 chiều, highlight quá hạn?**
✅ OK — `DebtReportTab.tsx`: 2 tabs (Khách nợ / Nợ NCC), `isOverdue` → `bg-destructive/5` row + Badge "Quá hạn".

---

## D. MODULE BOOKING

**20. Tab "Lưu ý đặc biệt" — 6 loại note_type?**
✅ OK — `BookingSpecialNotesTab.tsx`: 6 types (health, request, elderly_child, event, operation, finance) với icon riêng.

**21. Note priority='high' → banner đỏ đầu trang BookingDetail?**
✅ OK — `BookingDetail.tsx` line 107: `Alert variant="destructive"` hiển thị khi `highNotes.length > 0`.

**22. Danh sách Bookings — icon cảnh báo cạnh booking có lưu ý cao?**
✅ OK — `Bookings.tsx` line 63-75: query `booking_special_notes` priority='high', line 118: `AlertTriangle` icon cạnh mã booking.

---

## E. MODULE HỢP ĐỒNG

**23. Route /hop-dong render Contracts (không phải ComingSoon)?**
✅ OK — `App.tsx` line 57: route `/hop-dong` → `<Contracts />`. `Contracts.tsx` là full implementation, không phải ComingSoon.

**24. Tạo HĐ từ booking — auto-fill?**
✅ OK — `ContractFormDialog.tsx`: Select booking → hiển thị KH + giá trị. Insert sử dụng `customer_id` và `total_value` từ booking. Lưu ý: **không filter chỉ booking confirmed** — filter là `NOT CANCELLED` (tất cả trừ hủy).

**25. Upload file HĐ scan?**
✅ OK — `ContractDetailDialog.tsx` line 87-117: upload file vào bucket `contract-files`, lưu record vào `documents`.

**26. Timeline trạng thái 5 bước?**
✅ OK — `statusFlow = ["DRAFT", "PENDING_SIGN", "SIGNED", "IN_PROGRESS", "COMPLETED"]`. Hiển thị visual timeline với check icon.

---

## F. NOTIFICATIONS

**27. NotificationBell trong AppLayout header?**
✅ OK — `AppLayout.tsx` line 10 import + line 17 render `<NotificationBell />`.

**28. Badge đỏ hiển thị count unread?**
✅ OK — `NotificationBell.tsx` line 68-70: span với `bg-destructive`, hiển thị count (max "99+").

**29. Click item → navigate + mark read?**
✅ OK — `markAsRead`: update `is_read=true`, navigate to `/khach-hang/${entityId}`.

**30. Edge Function daily-reminders tồn tại?**
✅ OK — `supabase/functions/daily-reminders/index.ts` tồn tại.

---

## G. DASHBOARD

**31. SALE → PersonalDashboard: KPI + sự kiện + lead follow-up?**
✅ OK — `PersonalDashboard.tsx`: 4 stat cards (doanh số, booking, lead, KH), KpiProgressCard, card "Sự kiện sắp tới", card "Lead cần follow-up".

**32. MANAGER → ManagerKPIDashboard: target, % hoàn thành, BXH Sale?**
✅ OK — `getDashboardType` returns "manager" cho MANAGER. `ManagerKPIDashboard.tsx`: sale_targets, KpiTeamTable, KpiSetDialog.

**33. MANAGER chỉ thấy doanh thu nhánh, KHÔNG thấy lợi nhuận?**
✅ OK — `Finance.tsx` line 220: Manager gets `ManagerFinanceView` → chỉ `RevenueReportTab` với `departmentFilter`. Dashboard cũng chỉ scope team.

**34. CEO → BusinessDashboard: mọi KPI toàn công ty?**
✅ OK — `getDashboardType` returns "business" cho ADMIN/DIRECTOR/KETOAN. `BusinessDashboard` hiển thị scope "all" + `CeoDashboardCharts`.

**35. HCNS → HrDashboard: nhân sự, nghỉ phép?**
✅ OK — `getDashboardType` returns "hr" cho HCNS/HR_MANAGER/HR_HEAD. `HrDashboard.tsx`: stats NV, nghỉ phép pending, KpiCompanyOverview.

---

## H. SETTINGS

**36. Tab Phân quyền — checkbox matrix hoạt động?**
✅ OK — `SettingsPermissionsTab.tsx`: danh sách NV, click mở `PermissionEditDialog` với checkbox matrix. `PermissionEditDialog.tsx`: 3-state toggle (default/granted/revoked), save upsert/delete overrides.

**37. CEO tick can_delete cho NV → NV thấy nút Xóa?**
✅ OK — Khi grant override `*.delete` cho employee → `usePermissions` trả `true` → UI hiện nút Xóa.

**38. Reset về mặc định role hoạt động?**
❌ **CẦN FIX** — `PermissionEditDialog.tsx` không có nút "Reset về mặc định". Chỉ có toggle từng permission. Cần thêm nút xóa tất cả overrides cho employee (DELETE FROM employee_permissions WHERE employee_id = ?).

---

## TÓM TẮT

| # | Mục | Trạng thái |
|---|-----|-----------|
| 1-5 | Module Khách hàng | ✅ Tất cả OK |
| 6-9 | Module Lead | ✅ Tất cả OK |
| 10-19 | Module Tài chính | ✅ Tất cả OK |
| 20-22 | Module Booking | ✅ Tất cả OK |
| 23-26 | Module Hợp đồng | ✅ Tất cả OK |
| 27-30 | Notifications | ✅ Tất cả OK |
| 31-35 | Dashboard | ✅ Tất cả OK |
| 36-37 | Settings Permissions | ✅ OK |
| **38** | **Reset permissions** | **❌ CẦN FIX** |

## KẾ HOẠCH FIX (1 mục)

### Mục 38: Thêm nút "Reset về mặc định" trong PermissionEditDialog

**File**: `src/components/settings/PermissionEditDialog.tsx`

- Thêm nút "Reset về mặc định" trong DialogFooter
- Khi click: `DELETE FROM employee_permissions WHERE employee_id = <id>`
- Reset `permStates` về `{}`
- Toast thông báo "Đã reset quyền về mặc định theo role"
- Invalidate query

