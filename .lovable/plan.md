

# Thêm role GDKD (Giám đốc Kinh doanh)

## Tóm tắt
Thêm role `GDKD` vào hệ thống với quyền hạn giống hệt `MANAGER` (Trưởng phòng kinh doanh). GDKD sẽ thấy cùng sidebar, dashboard, và dữ liệu phạm vi phòng ban (team scope) như MANAGER.

## Các thay đổi

### 1. Migration SQL (1 file mới)
- Thêm `GDKD` vào `profiles_role_check` constraint
- Thêm case `WHEN 'GDKD'` vào hàm `get_default_permissions_for_role` với cùng danh sách quyền như MANAGER
- Thêm `GDKD` vào tất cả RLS policies hiện tại đang có `MANAGER`:
  - `customers_read` (team scope với `department_id`)
  - `bookings_read` (team scope)
  - `booking_itineraries_*` (read/insert/update)
  - `booking_notes_read`, `booking_notes_write`
  - `employee_kpis` (kpi_read, kpi_update, kpi_write)
  - `accommodations_write`

### 2. `src/hooks/usePermissions.ts`
- Thêm `GDKD` vào `DEFAULT_PERMISSIONS` với cùng danh sách quyền như MANAGER

### 3. `src/hooks/useDashboardData.ts`
- Thêm `GDKD` vào `MANAGER_ROLES` array → dashboard hiển thị dạng "manager" (team scope)

### 4. `src/pages/Settings.tsx`
- Sửa `isManager` từ `role === "MANAGER"` thành `["MANAGER", "GDKD"].includes(role || "")` → GDKD thấy tab Phân quyền

### 5. `src/pages/Finance.tsx`
- Thêm `GDKD` vào kiểm tra `isManager` → GDKD chỉ thấy ManagerFinanceView (doanh thu phòng ban)

### 6. `src/pages/SOPLibrary.tsx`
- Thêm `GDKD` vào `MANAGER_ROLES` → GDKD thấy tab thống kê SOP

### 7. `src/components/employees/EmployeeRoleTab.tsx`
- Không cần thay đổi (MANAGER_ROLES ở đây là admin-level, GDKD không cần)

## Tổng: 1 migration + sửa 4 file TypeScript

