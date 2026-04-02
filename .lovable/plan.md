

# Xóa role SUPER_ADMIN khỏi hệ thống

## Tóm tắt
Gộp SUPER_ADMIN vào ADMIN — không có user nào đang dùng SUPER_ADMIN. Mọi nơi check `SUPER_ADMIN` sẽ chỉ còn `ADMIN`.

## 1. Database Migration

### a. Cập nhật CHECK constraint
Xóa `'SUPER_ADMIN'` khỏi `profiles_role_check`.

### b. Cập nhật RLS policies (~25 policies)
Xóa `'SUPER_ADMIN'` khỏi mảng role trong tất cả policies trên các bảng:
- audit_logs, booking_itineraries, booking_special_notes, bookings, budget_estimates, budget_settlements, contracts, customers, department_sops, documents, employee_kpis, employee_permissions, employees, settlement_items

### c. Cập nhật DB functions
- `get_default_permissions_for_role`: xóa case SUPER_ADMIN
- `prevent_role_change`: xóa `has_role(auth.uid(), 'SUPER_ADMIN')`
- `prevent_profile_field_change`: xóa SUPER_ADMIN khỏi `has_any_role` check
- `handle_new_user`: không ảnh hưởng (default là SALE_DOMESTIC)

## 2. Frontend — Sửa ~15 file

| File | Thay đổi |
|------|----------|
| `src/hooks/usePermissions.ts` | Xóa entry `SUPER_ADMIN` khỏi `DEFAULT_PERMISSIONS` |
| `src/hooks/useDashboardData.ts` | `ADMIN_ROLES`: xóa SUPER_ADMIN → `["ADMIN"]` |
| `src/pages/Settings.tsx` | `ADMIN_ROLES` → `["ADMIN"]` |
| `src/pages/Dashboard.tsx` | `canViewRevenue` → `["ADMIN", "KETOAN"]` |
| `src/pages/Finance.tsx` | `FULL_ACCESS_ROLES` → `["ADMIN", "KETOAN"]` |
| `src/pages/LeaveManagement.tsx` | Xóa SUPER_ADMIN khỏi `APPROVER_ROLES`, `FULL_VIEW_ROLES` |
| `src/pages/Payroll.tsx` | Xóa SUPER_ADMIN khỏi `FULL_VIEW_ROLES` |
| `src/pages/SOPLibrary.tsx` | `ADMIN_ROLES` → `["ADMIN"]` |
| `src/pages/Employees.tsx` | Xóa SUPER_ADMIN khỏi `ROLE_LABEL_MAP` |
| `src/components/settings/SettingsAccountsTab.tsx` | Xóa option SUPER_ADMIN |
| `src/components/settings/SettingsRolesTab.tsx` | Xóa card SUPER_ADMIN |
| `src/components/settings/SettingsPermissionsTab.tsx` | `ADMIN_ROLES` → `["ADMIN"]` |
| `src/components/settings/SettingsDepartmentsTab.tsx` | `isAdmin` chỉ check `"ADMIN"` |
| `src/components/employees/EmployeeRoleTab.tsx` | Xóa option SUPER_ADMIN, `MANAGER_ROLES` → `["ADMIN", "HCNS"]` |
| `src/components/employees/EmployeeKpiTab.tsx` | Xóa SUPER_ADMIN khỏi `canEval` |
| `src/components/contracts/ContractDetailDialog.tsx` | Xóa SUPER_ADMIN khỏi `canChangeStatus` |
| `src/components/finance/BudgetSettlementsTab.tsx` | Xóa SUPER_ADMIN khỏi `isKetoan`, `isCeo`; cũng xóa DIRECTOR khỏi `isCeo` (sót từ lần trước) |
| `src/components/dashboard/CeoDashboardCharts.tsx` | Xóa SUPER_ADMIN và DIRECTOR khỏi `isCeo` → chỉ `["ADMIN"]` |

## Tổng: 1 migration + sửa ~15 file TypeScript

