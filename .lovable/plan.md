

# Refactor PermissionGuard sang API `hasPermission(module, action)`

## Tổng quan

Chuyển đổi `PermissionGuard` và `usePermissions` từ format `"module.action"` sang `hasPermission(module, action)` theo đề xuất của user. Cập nhật tất cả call sites.

## Thay đổi

### 1. `src/hooks/usePermissions.ts`

- Thay `hasPermission(key: PermissionKey)` → `hasPermission(module: string, action: string)` kiểm tra `permissions.has(\`${module}.${action}\`)`
- Thay `hasAnyPermission(keys)` → `hasAnyPermission(pairs: [string, string][])` 
- Giữ nguyên `ALL_PERMISSION_KEYS`, `DEFAULT_PERMISSIONS`, `SCOPE_RULES`, override logic

### 2. `src/components/PermissionGuard.tsx`

- Props: `permission?: PermissionKey` → `module?: string; action?: string`
- Props: `anyOf?: PermissionKey[]` → `anyOf?: [string, string][]`
- Logic: `hasPermission(module, action)` thay vì `hasPermission("module.action")`

### 3. `src/App.tsx` — Route guards

Thay `permission="customers.view"` → `module="customers" action="view"` cho tất cả routes. `anyOf={["finance.view", "finance.submit"]}` → `anyOf={[["finance", "view"], ["finance", "submit"]]}`.

### 4. Tất cả pages/components dùng `hasPermission` (14+ files)

Thay mọi `hasPermission("module.action")` → `hasPermission("module", "action")`:
- `Employees.tsx`: `hasPermission("staff", "delete")`, etc.
- `Customers.tsx`: `hasPermission("customers", "export")`
- `Finance.tsx`: `hasPermission("finance", "view")`, etc.
- `Vendors.tsx`: `hasPermission("suppliers", "edit")`, etc.
- `BookingItineraryTab.tsx`, `BookingServicesTab.tsx`, `BudgetEstimatesTab.tsx`, `BudgetSettlementsTab.tsx`, `TransactionFormDialog.tsx`, `ExpenseListTab.tsx`, `SOPLibrary.tsx`, `Settings.tsx`, `Payroll.tsx`

### 5. Thêm `/unauthorized` route (optional)

User snippet dùng `<Navigate to="/unauthorized" />`. Hiện tại redirect về `/`. Có thể thêm route này hoặc giữ redirect về `/` như cũ.

## Không thay đổi
- `DEFAULT_PERMISSIONS`, `ALL_PERMISSION_KEYS` (vẫn lưu format `"module.action"`)
- Override logic, Scope system, DB function
- `AppSidebar.tsx` (đã dùng `getVisibleModules()`)

