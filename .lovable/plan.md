

# Cập nhật toàn bộ hệ thống phân quyền — 4 phần đồng bộ

## Tổng quan
Thay thế PERMISSION_MATRIX, SCOPE_RULES, thêm data scoping vào 6 pages, và đồng bộ DB function `get_default_permissions_for_role()`.

## Phần 1: `src/hooks/usePermissions.ts` — Permission Matrix + Scope Rules

**Thay toàn bộ `DEFAULT_PERMISSIONS`** bằng bản chính thức 22 roles (ADMIN, SUPER_ADMIN, GDKD, MANAGER, DIEUHAN, HR_MANAGER, KETOAN, MKT, HCNS, 4x SALE, TOUR, 8x INTERN). Mỗi role sẽ lưu dạng flat array `PermissionKey[]` như hiện tại nhưng với nội dung mới.

Thay đổi chính so với hiện tại:
- Thêm SUPER_ADMIN (= ADMIN)
- Tất cả roles đều có: `dashboard.view`, `staff.view`, `payroll.view`, `leave.view`, `leave.create`
- MKT/INTERN_MKT: thêm `leads.view`
- DIEUHAN: thêm `dashboard.view`, `leave.*`, `staff.view`, `payroll.view`
- KETOAN: thêm `dashboard.view`, `leave.*`, `contracts.view`, `quotations.view`, `itineraries.view`, `staff.view`
- HR_MANAGER/HCNS: thêm `dashboard.view`, `finance.view`
- MANAGER: thêm `payroll.view`, `finance.view`, `leave.create`, `contracts.view`, `tour_packages.view`, `itineraries.view`
- GDKD: thêm `leave.create`, `tour_packages.view`, `itineraries.view`, `contracts.view`

**Thay toàn bộ `SCOPE_RULES`** với 22 roles đầy đủ theo đúng spec (DIEUHAN default=all, MANAGER.payroll=personal, HR_MANAGER/HCNS.finance=personal, etc.)

## Phần 2: Data Scoping — 6 pages

Hiện tại KHÔNG page nào dùng `getScope()`. Tất cả query toàn bộ data, chỉ dựa vào hardcoded role arrays.

### 2A. `src/pages/Employees.tsx`
- Thay `SELF_ONLY_ROLES` + `DEPT_SCOPED_ROLES` hardcode bằng `getScope("staff")`
- `scope === "personal"`: redirect tới hồ sơ bản thân (giữ logic hiện tại)
- `scope === "department"`: filter `department_id` (giữ logic hiện tại nhưng derive từ getScope)
- `scope === "all"`: hiện toàn bộ

### 2B. `src/pages/Payroll.tsx`
- Thay `FULL_VIEW_ROLES` hardcode bằng `getScope("payroll")`
- `scope === "personal"` → hiện payslip cá nhân
- `scope === "all"` → hiện bảng lương đầy đủ
- `scope === "department"` → filter theo department (cho GDKD)

### 2C. `src/pages/LeaveManagement.tsx`
- Thay `FULL_VIEW_ROLES` + `DEPT_SCOPED_ROLES` + `APPROVER_ROLES` hardcode bằng `getScope("leave")` + `hasPermission("leave", "approve")`
- `scope === "personal"` → chỉ đơn của mình
- `scope === "department"` → đơn phòng mình + nút duyệt nếu có quyền
- `scope === "all"` → tất cả đơn + nút duyệt

### 2D. `src/pages/Customers.tsx`
- Thêm `getScope("customers")` + `useAuth()`
- `scope === "personal"`: filter `.or(\`assigned_sale_id.eq.${user.id},created_by.eq.${user.id}\`)`
- `scope === "department"`: filter `.eq("department_id", myDeptId)`
- Count query cũng phải áp dụng cùng filter

### 2E. `src/pages/Leads.tsx`
- Thêm `getScope("leads")` + `useAuth()`
- `scope === "personal"`: filter `.eq("assigned_to", user.id)` (leads không có `created_by`, dùng `assigned_to`)
- `scope === "department"`: filter `.eq("department_id", myDeptId)`
- Count query cũng phải áp dụng cùng filter

### 2F. `src/pages/Bookings.tsx`
- Thêm `getScope("bookings")` + `useAuth()`
- `scope === "personal"`: filter `.eq("sale_id", user.id)`
- `scope === "department"`: filter `.eq("department_id", myDeptId)`
- Count query cũng phải áp dụng cùng filter

### 2G. `src/pages/Finance.tsx`
- Thay `FULL_ACCESS_ROLES` + `isManager` hardcode bằng `getScope("finance")`
- `scope === "personal"` → SubmitterView (nhập chi phí, chỉ thấy record mình)
- `scope === "department"` → ManagerFinanceView (doanh thu phòng ban)
- `scope === "all"` → Full finance tabs

### 2H. `src/pages/Settings.tsx`
- Thay `ADMIN_ROLES`/`HR_ROLES` hardcode: dùng `userRole` từ AuthContext
- Accounts/AuditLog: chỉ ADMIN/SUPER_ADMIN
- Departments/Levels: ADMIN/SUPER_ADMIN/HR_MANAGER/HCNS
- Permissions: ADMIN/SUPER_ADMIN (edit), MANAGER/GDKD (view-only)
- Ẩn nút thêm/sửa/xóa nếu không có `settings.edit`

### Helper: Department ID query
Tạo shared hook hoặc inline query pattern để lấy `department_id` cho scope=department:
```ts
const { data: myDeptId } = useQuery({
  queryKey: ["my-dept-id"],
  queryFn: async () => {
    const { data } = await supabase.rpc("get_my_department_id");
    return data;
  },
  enabled: scope === "department",
});
```

## Phần 3: DB Migration — Đồng bộ `get_default_permissions_for_role()`

Tạo migration cập nhật function cho tất cả 22 roles khớp chính xác với PERMISSION_MATRIX ở Phần 1. Thêm case SUPER_ADMIN. Đảm bảo mọi role đều có `dashboard.view`, `staff.view`, `payroll.view`, `leave.view`, `leave.create`.

## Files thay đổi
1. `src/hooks/usePermissions.ts` — matrix + scope rules
2. `src/pages/Employees.tsx` — scope-based filtering
3. `src/pages/Payroll.tsx` — scope-based filtering
4. `src/pages/LeaveManagement.tsx` — scope-based filtering
5. `src/pages/Customers.tsx` — scope-based filtering
6. `src/pages/Leads.tsx` — scope-based filtering
7. `src/pages/Bookings.tsx` — scope-based filtering
8. `src/pages/Finance.tsx` — scope-based view selection
9. `src/pages/Settings.tsx` — role-based tab visibility + SUPER_ADMIN
10. DB migration — sync `get_default_permissions_for_role()`

## Lưu ý kỹ thuật
- `leads` table KHÔNG có `created_by` → filter bằng `assigned_to` cho scope personal
- `bookings` table KHÔNG có `created_by` → filter bằng `sale_id`
- `customers` table CÓ cả `assigned_sale_id`, `created_by`, `department_id`
- DB function `get_my_department_id()` đã tồn tại, dùng trực tiếp
- Giữ nguyên override system (`employee_permissions`)

