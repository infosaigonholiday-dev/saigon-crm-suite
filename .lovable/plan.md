

# Cập nhật ma trận phân quyền theo PERMISSION_MATRIX mới

## Tổng quan

Cập nhật hệ thống phân quyền client-side theo ma trận mới, bao gồm: đổi tên module, thêm module mới, cập nhật quyền mặc định cho từng role, và thêm hệ thống Scope (all/department/personal). Giữ nguyên cơ chế override từ `employee_permissions`.

## Thay đổi chính

### 1. Đổi tên module (breaking)
| Cũ | Mới |
|---|---|
| `employees.*` | `staff.*` |
| `vendors.view` | `suppliers.*` (view/create/edit/delete) |
| `sop.*` | `workflow.*` |

### 2. Module mới cần thêm
- `tour_packages.*` (view/create/edit/delete)
- `accommodations.*` (view/create/edit/delete)  
- `contracts.*` (view/create/edit/delete)
- `dashboard.view`

### 3. Thay đổi quyền đáng chú ý
- **GDKD**: thêm `bookings.approve`, `finance.view/edit`; bỏ `customers.edit`, `leads.edit`; thêm `staff.create/edit`
- **MANAGER**: bỏ `customers.edit`, `payments.create`; bỏ `finance.view` (chỉ giữ `submit`)
- **KETOAN**: thêm `finance.create`, `suppliers.create`; bỏ `payroll.create`
- **HR_MANAGER**: bỏ `finance.view`; thêm `finance.create`
- **MKT**: bỏ `customers.view`, `leads.view`
- **SALE_***: bỏ `sop.view` → không có `workflow.view`? (Matrix có `workflow: ['view']`)
- **INTERN_SALE_***: thêm `customers.create`, `leads.create`, `bookings.create`
- **INTERN_MKT**: bỏ `customers.view`, `leads.view`; thêm `leads.create/edit`

### 4. Thêm Scope system
Hàm `getScope(module)` trả về `'all' | 'department' | 'personal'` theo role.

## Các file cần sửa

### `src/hooks/usePermissions.ts` — thay đổi lớn
- Cập nhật `ALL_PERMISSION_KEYS`: đổi tên + thêm keys mới
- Cập nhật `PERMISSION_GROUPS`: đổi tên + thêm groups
- Cập nhật `DEFAULT_PERMISSIONS`: theo PERMISSION_MATRIX mới
- Thêm `SCOPE_RULES` và export `getScope()`
- Thêm `getVisibleModules()` vào hook return
- Giữ nguyên override logic từ `employee_permissions`

### `src/components/AppSidebar.tsx`
- `employees.view` → `staff.view`
- `vendors.view` → `suppliers.view`
- `sop.view` → `workflow.view`
- Thêm permission riêng cho Gói tour (`tour_packages.view`), Lịch trình, Lưu trú (`accommodations.view`), Hợp đồng (`contracts.view`)

### `src/App.tsx`
- Route guards: `employees.view` → `staff.view`, `sop.view` → `workflow.view`
- Thêm guards riêng cho `/goi-tour`, `/lich-trinh`, `/luu-tru`, `/hop-dong`, `/nha-cung-cap`

### `src/components/PermissionGuard.tsx`
- Không thay đổi logic, chỉ type PermissionKey tự cập nhật

### `src/pages/Employees.tsx` & `src/pages/EmployeeDetail.tsx`
- `employees.delete` → `staff.delete`, `employees.create` → `staff.create`, `employees.edit` → `staff.edit`

### `src/pages/Vendors.tsx`
- `bookings.edit` → `suppliers.edit`, `bookings.delete` → `suppliers.delete`

### `src/components/settings/PermissionEditDialog.tsx` & `SettingsPermissionsTab.tsx`
- Tự cập nhật theo `PERMISSION_GROUPS` và `ALL_PERMISSION_KEYS` mới

### `src/components/finance/ExpenseListTab.tsx`
- `customers.delete` → sửa thành key đúng nếu cần

### `src/components/bookings/BookingItineraryTab.tsx`
- Giữ nguyên `bookings.delete`

### DB Migration
- Cập nhật hàm `get_default_permissions_for_role` để đồng bộ với client

## Không thay đổi
- RLS policies (đã đúng, không liên quan đến key rename)
- Override system (`employee_permissions` table)
- Hook API signature (`hasPermission(key)` giữ format `"module.action"`)

