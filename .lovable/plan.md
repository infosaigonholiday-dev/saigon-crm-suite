

# Xóa role DIRECTOR, HR_HEAD, INTERN khỏi hệ thống

## Tóm tắt
Xóa hoàn toàn 3 role: **DIRECTOR**, **HR_HEAD**, **INTERN** (generic). User DIRECTOR hiện tại (marketing@) chuyển sang GDKD. Không có user nào đang dùng HR_HEAD hoặc INTERN. Các role INTERN_* (INTERN_DIEUHAN, INTERN_SALE_DOMESTIC, v.v.) vẫn giữ nguyên.

## Lưu ý quan trọng
- User marketing@ sẽ **mất quyền truy cập toàn bộ** (global scope) → chỉ thấy dữ liệu phòng ban (team scope) như MANAGER/GDKD.
- Quyền global giờ chỉ còn: ADMIN, SUPER_ADMIN, KETOAN (tài chính), DIEUHAN (vận hành).

---

## 1. Migration SQL — Cập nhật RLS, constraint, functions

### a. Xóa CHECK constraint cũ, tạo mới không có DIRECTOR/HR_HEAD/INTERN
```
Giữ lại: ADMIN, SUPER_ADMIN, HCNS, HR_MANAGER, KETOAN, MANAGER, GDKD, DIEUHAN,
SALE_DOMESTIC/INBOUND/OUTBOUND/MICE, TOUR, MKT,
INTERN_DIEUHAN, INTERN_SALE_*, INTERN_MKT, INTERN_HCNS, INTERN_KETOAN
```

### b. Cập nhật ~30 RLS policies
Xóa `'DIRECTOR'` và `'HR_HEAD'` khỏi tất cả mảng role trong các policy trên các bảng:
- accommodations, bookings, booking_itineraries, booking_special_notes
- customers, contracts, employee_kpis, employee_permissions
- department_sops, audit_logs, documents
- Và các bảng HR: employee_salaries, commission_*, career_paths, business_travel, leave_requests, payroll_*

### c. Cập nhật hàm `get_default_permissions_for_role`
- Xóa case DIRECTOR, HR_HEAD, INTERN

### d. Cập nhật hàm `prevent_role_change`
- Xóa `has_role(auth.uid(), 'HR_HEAD')` (giữ HR_MANAGER, HCNS)

### e. Cập nhật trigger `prevent_profile_field_change`
- Không thay đổi (chỉ check ADMIN/SUPER_ADMIN)

## 2. Data update (INSERT tool)
```sql
UPDATE profiles SET role = 'GDKD' WHERE role = 'DIRECTOR';
```
(Không có user HR_HEAD/INTERN nên không cần update thêm)

## 3. Frontend — Sửa ~15 file

### `src/hooks/usePermissions.ts`
- Xóa entry `DIRECTOR`, `HR_HEAD`, `INTERN` khỏi `DEFAULT_PERMISSIONS`

### `src/hooks/useDashboardData.ts`
- Xóa `HR_HEAD` khỏi `HR_ROLES` (giữ HCNS, HR_MANAGER)
- Xóa `INTERN` khỏi `SELF_ROLES` (các INTERN_* đã được handle riêng)

### `src/pages/Settings.tsx`
- Xóa `isDirector` logic
- Xóa `HR_HEAD` khỏi `HR_ROLES`
- `showDepartments/showLevels`: chỉ `isAdmin || isHR`
- `showPermissions`: `isAdmin || isManager`
- `showAuditLog`: chỉ `isAdmin`

### `src/pages/Finance.tsx`
- `FULL_ACCESS_ROLES`: xóa DIRECTOR → `["ADMIN", "SUPER_ADMIN", "KETOAN"]`

### `src/pages/Dashboard.tsx`
- `canViewRevenue`: xóa DIRECTOR → `["ADMIN", "SUPER_ADMIN", "KETOAN"]`

### `src/pages/LeaveManagement.tsx`
- Xóa DIRECTOR, HR_HEAD khỏi `APPROVER_ROLES` và `FULL_VIEW_ROLES`

### `src/pages/Payroll.tsx`
- Xóa DIRECTOR, HR_HEAD khỏi `FULL_VIEW_ROLES`

### `src/pages/SOPLibrary.tsx`
- Xóa DIRECTOR, HR_HEAD khỏi `ADMIN_ROLES`

### `src/pages/Employees.tsx`
- Xóa DIRECTOR khỏi `levelLabels/levelColors` (đây là employee level, không phải role — **giữ nguyên** vì level và role khác nhau)
- Xóa HR_HEAD khỏi `ROLE_LABEL_MAP`
- Xóa `INTERN` khỏi `SELF_ONLY_ROLES`

### `src/components/settings/SettingsAccountsTab.tsx`
- Xóa option DIRECTOR, HR_HEAD, INTERN khỏi danh sách role select

### `src/components/settings/SettingsRolesTab.tsx`
- Xóa card DIRECTOR, HR_HEAD, INTERN

### `src/components/settings/SettingsPermissionsTab.tsx`
- Xóa DIRECTOR khỏi `ADMIN_ROLES`

### `src/components/employees/EmployeeRoleTab.tsx`
- Xóa option DIRECTOR, HR_HEAD, INTERN

### `src/components/employees/EmployeeKpiTab.tsx`
- Xóa DIRECTOR, HR_HEAD khỏi `canEval` (thay bằng GDKD nếu cần)

### `src/components/employees/EmployeeFormDialog.tsx`
- Xóa DIRECTOR, INTERN khỏi danh sách role (giữ INTERN_* roles)
- **Giữ nguyên** INTERN trong employment_type và status vì đó là loại hợp đồng/trạng thái, không phải role

### `src/components/contracts/ContractDetailDialog.tsx`
- Xóa DIRECTOR khỏi `canChangeStatus`

---

## Tổng: 1 migration + 1 data update + sửa ~15 file TypeScript

