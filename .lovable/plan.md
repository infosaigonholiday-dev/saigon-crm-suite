
# Plan tối ưu Performance — Saigon Holiday CRM

## Tình trạng phát hiện trước khi sửa

**Đã có sẵn (KHÔNG cần làm lại):**
- ✅ Customers, Leads, Bookings, Employees, B2BTours: **đã có pagination** server-side với `PAGE_SIZE = 20` + `.range()` + nút Trước/Sau.
- ✅ AlertsCenter: 3/4 query đã select cột cụ thể; chỉ tab Khẩn cấp (`urgentNotifs`) còn `select("*")`.
- ✅ Lazy loading đã bật cho 27/28 page.

**Cần sửa thực tế:**
- ❌ 32 file còn `select("*")` cần thu hẹp cột.
- ❌ RawContacts.tsx chưa có pagination (44 records, file 696 dòng).
- ❌ NotificationBell poll mỗi 60s với `select("*")` + chưa tách query unread count.
- ❌ Một số query trong Customers/Leads/Bookings dùng `select("*", { count: 'exact', head: true })` — cái này OK vì `head: true` chỉ lấy count, KHÔNG fetch data → **không cần đổi**.

---

## A. Tối ưu `select("*")` — chỉ những file ảnh hưởng thực

Quy tắc: chỉ chọn cột mà UI render + id + foreign key cần thiết. Giữ nguyên các quan hệ join (`departments(name)`, `profiles(full_name)`...).

### A1. NotificationBell.tsx (ưu tiên cao nhất, polling 60s)
Hiện: `select("*").limit(50)` chạy mỗi 60s cho **mọi user**.
Đổi thành 2 query song song:
- **Query 1 — Badge count** (light, poll 60s, dùng `useQuery` riêng key `["alerts-badge", userId]`):
  ```
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId).eq("is_read", false)
  ```
- **Query 2 — List 50 mới nhất** (chỉ chạy khi user mở popover — `enabled: open`):
  ```
  .select("id, type, title, message, entity_type, entity_id, is_read, priority, created_at")
  .eq("user_id", userId).order("created_at", { ascending: false }).limit(50)
  ```
- Realtime channel giữ nguyên (chỉ invalidate cả 2 keys).
- `unreadCount` lấy từ Query 1 thay vì đếm từ list.

### A2. AlertsCenter.tsx — tab Khẩn cấp
Đổi `select("*")` ở dòng 31 thành:
```
select("id, type, title, message, entity_type, entity_id, priority, created_at, is_read")
```

### A3. Finance.tsx (2 query summary tổng)
Dòng 68 & 81: chỉ cần `amount` (và `created_at` nếu lọc theo thời gian) cho summary card → đổi `select("*")` → `select("amount")` hoặc `select("id, amount, transaction_date")` tùy logic. Sẽ đọc context cụ thể khi implement.

### A4. Finance report tabs (RevenueReportTab, ProfitReportTab, CashflowReportTab, TaxReportTab, DebtReportTab)
Mỗi tab chỉ select cột render trên chart/table (ví dụ ProfitReport: `month, gross_profit, net_profit, net_margin_pct`). Đọc UI cụ thể từng file rồi rút gọn.

### A5. ExpenseListTab, BudgetSettlementsTab (2 chỗ), SettingsExpenseCategoriesTab
- ExpenseListTab: `select("id, expense_date, category, description, amount")`
- BudgetSettlementsTab: `select("id, code, status, total_estimated, total_actual, variance, created_at, created_by, booking_id")` — chỉnh theo render cụ thể.

### A6. Employee sub-tabs (6 file)
- EmployeeFormDialog: select cột form thực sự dùng để edit (full_name, email, phone, department_id, position, level, salary_base, ...).
- EmployeeKpiTab: `period_year, period_month, target, actual, achievement_pct, note`.
- EmployeeSalaryTab: `month, year, gross_salary, net_salary, ...`.
- EmployeeLeaveTab/OvertimeTab/InsuranceTab: tương tự, chỉ cột render trong table.

### A7. Module pages
- B2BTours.tsx (dòng 94): chỉ cột render trong bảng (`id, tour_code, destination, departure_date, return_date, price_adl, available_seats, ...`).
- Accommodations.tsx: cột render (`id, name, type, location, city, country, rating, status, contact_phone`).
- Vendors.tsx: cột render trong table.
- ContractDetailDialog, BookingItineraryTab, AppSidebar, AuditHistoryTab, KpiProgressCard, CeoCustomerOverview, ManagerKPIDashboard, TourPackages, SOPLibrary: rút gọn theo UI thực tế từng file.

**Lưu ý:** với các select có embed như `select("*, profiles(full_name)")`, đổi `*` thành danh sách cột nhưng giữ nguyên embed.

---

## B. Pagination cho RawContacts.tsx

Áp pattern giống Customers/Leads:
- `const PAGE_SIZE = 20;` + `const [page, setPage] = useState(0);`
- 2 query (myData + deptData):
  - Thêm `.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)`.
  - Đổi `selectFields` từ `"*, ..."` thành cột cụ thể: `"id, full_name, phone, email, company_name, source, status, assigned_to, created_by, department_id, created_at, assigned_profile:profiles!raw_contacts_assigned_to_fkey(full_name), departments(name)"`.
  - Thêm count query song song để tính `totalPages`.
- Reset `setPage(0)` khi đổi search/filter/tab.
- Footer table: nút Trước | "Trang X/Y" | Sau (giống pattern hiện có ở các trang khác).

---

## C. NotificationBell polling tối ưu (đã mô tả ở A1)

Tóm tắt thay đổi hành vi:
- Trước: 1 query `select("*").limit(50)` poll 60s → mỗi user fetch ~50 record/phút.
- Sau:
  - Badge count query (head-only): poll 60s → ~0 byte payload.
  - List query: chỉ fetch khi `open === true` (user click bell) → giảm 95% traffic notifications.
  - Realtime invalidate cả 2 query khi có insert mới.

---

## D. Báo cáo & kiểm tra

1. Chạy `npm run build` → paste số errors / warnings / bundle size (main chunk + tổng).
2. Đọc console logs preview/published để liệt kê warnings/errors nghiêm trọng.
3. Rà nhanh useEffect trong NotificationBell, AppLayout, AppSidebar, Dashboard xem có dependency gây re-render loop không (chỉ báo cáo, không fix nếu không có vấn đề thực).

---

## Phạm vi file sẽ chỉnh sửa

**Sửa logic + select:**
1. `src/components/NotificationBell.tsx`
2. `src/pages/AlertsCenter.tsx`
3. `src/pages/RawContacts.tsx`
4. `src/pages/Finance.tsx`
5. `src/pages/B2BTours.tsx`
6. `src/pages/Accommodations.tsx`
7. `src/pages/Vendors.tsx`
8. `src/pages/TourPackages.tsx`
9. `src/pages/SOPLibrary.tsx`
10. `src/pages/ManagerKPIDashboard.tsx`

**Sửa select cột:**
11. `src/components/finance/RevenueReportTab.tsx`
12. `src/components/finance/ProfitReportTab.tsx`
13. `src/components/finance/CashflowReportTab.tsx`
14. `src/components/finance/TaxReportTab.tsx`
15. `src/components/finance/DebtReportTab.tsx`
16. `src/components/finance/ExpenseListTab.tsx`
17. `src/components/finance/BudgetSettlementsTab.tsx`
18. `src/components/settings/SettingsExpenseCategoriesTab.tsx`
19. `src/components/employees/EmployeeFormDialog.tsx`
20. `src/components/employees/EmployeeKpiTab.tsx`
21. `src/components/employees/EmployeeSalaryTab.tsx`
22. `src/components/employees/EmployeeLeaveTab.tsx`
23. `src/components/employees/EmployeeOvertimeTab.tsx`
24. `src/components/employees/EmployeeInsuranceTab.tsx`
25. `src/components/contracts/ContractDetailDialog.tsx`
26. `src/components/bookings/BookingItineraryTab.tsx`
27. `src/components/leads/AuditHistoryTab.tsx`
28. `src/components/dashboard/CeoCustomerOverview.tsx`
29. `src/components/kpi/KpiProgressCard.tsx`
30. `src/components/AppSidebar.tsx`

**Không sửa** (đã tối ưu hoặc không phải `select` data thực):
- Customers/Leads/Bookings/Employees: pagination + select cột rồi.
- `select("*", { count: 'exact', head: true })`: chỉ đếm, không fetch data.

---

## Rủi ro & cách giảm

- **Quên cột render** → UI hiện "—" hoặc undefined. Giảm thiểu: đọc UI từng file trước khi rút gọn select; giữ `id` + tất cả foreign key dùng cho navigate.
- **Realtime payload nhỏ hơn cột select** → vẫn OK vì chỉ dùng để invalidate cache, không đọc data trực tiếp.
- **RawContacts dùng `assigned_profile?.full_name` để build filter `deptStaffOptions`** → giữ embed `assigned_profile:profiles!raw_contacts_assigned_to_fkey(full_name)` trong select cột.

---

## Kết quả mong đợi

- Notifications traffic giảm ~95% (badge count head-only).
- RawContacts load < 200ms thay vì fetch toàn bộ 44+ rows mỗi lần.
- Bundle size không đổi (chỉ thay query string), nhưng payload JSON nhỏ hơn 40-70% trên các bảng nhiều cột (employees, b2b_tours, raw_contacts, transactions).
- Báo cáo cuối: build status, bundle size, console errors.
