

## Thắt chặt quyền DELETE: Chỉ ADMIN/SUPER_ADMIN

### Tổng quan
Loại bỏ quyền xóa mặc định khỏi tất cả role (kể cả DIRECTOR), chỉ giữ cho ADMIN/SUPER_ADMIN. CEO có thể cấp quyền xóa cho cá nhân cụ thể qua employee_permissions override.

### Thay đổi

#### 1. `src/hooks/usePermissions.ts` — Bỏ `.delete` khỏi non-admin roles
- DIRECTOR: bỏ tất cả `.delete` keys (hiện không có — OK)
- HR_MANAGER: bỏ `employees.delete`
- HR_HEAD: bỏ `employees.delete`
- Các role khác: không có `.delete` — không cần sửa
- ADMIN/SUPER_ADMIN: giữ nguyên (có tất cả quyền)

#### 2. Migration SQL — Cập nhật DB function + RLS DELETE policies

**Cập nhật `get_default_permissions_for_role`**: Bỏ tất cả `.delete` keys khỏi HR_MANAGER và HR_HEAD.

**Cập nhật RLS DELETE policies** trên các bảng nghiệp vụ (chỉ cho ADMIN/SUPER_ADMIN):
- `bookings` — đã có `bookings_delete`, sửa bỏ DIRECTOR
- `employees` — `employees_delete`, sửa bỏ DIRECTOR/HR_HEAD
- `customers` — chưa có policy DELETE riêng (nằm trong `customers_write` ALL), cần tách riêng DELETE
- `leads` — tương tự, tách DELETE từ `leads_write`
- `vendors`, `tour_services`, `transactions`, `office_expenses`, `marketing_expenses`, `other_expenses`, `booking_itineraries` — thêm/sửa DELETE policy

#### 3. Frontend — Ẩn nút Xóa bằng permission check

| File | Module | Permission key |
|------|--------|---------------|
| `src/pages/Employees.tsx` | Nút xóa nhân viên | `employees.delete` |
| `src/pages/Vendors.tsx` | Nút xóa NCC | `settings.edit` (giữ nguyên logic hiện tại) |
| `src/components/finance/ExpenseListTab.tsx` | Nút xóa chi phí | `finance.edit` → đổi thành kiểm tra thêm delete |
| `src/components/finance/TransactionListTab.tsx` | Nút xóa giao dịch | tương tự |
| `src/components/bookings/BookingServicesTab.tsx` | Nút xóa dịch vụ tour | `bookings.delete` |
| `src/components/bookings/BookingItineraryTab.tsx` | Nút xóa ngày lịch trình | `bookings.delete` |
| `src/components/settings/SettingsDepartmentsTab.tsx` | Nút xóa phòng ban | `settings.edit` (giữ nguyên — chỉ ADMIN) |

Cách bọc: thêm `usePermissions()` hook, wrap nút xóa với `{hasPermission('xxx.delete') && ...}`. Nút không render nếu không có quyền.

### Chi tiết kỹ thuật

**Migration SQL** sẽ:
1. DROP + CREATE lại `get_default_permissions_for_role` — bỏ `.delete` khỏi HR_MANAGER và HR_HEAD
2. DROP + CREATE lại DELETE policies cho: `bookings`, `employees`, `customers`, `leads`
3. Thêm DELETE policy mới cho: `tour_services`, `transactions`, `office_expenses`, `marketing_expenses`, `other_expenses`, `booking_itineraries`, `vendors`
4. Tất cả DELETE policy: `USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))`

**Frontend files sửa** (6 files):
- `src/hooks/usePermissions.ts`: Bỏ `employees.delete` khỏi HR_MANAGER, HR_HEAD
- `src/pages/Employees.tsx`: Bọc nút xóa + AlertDialog bằng `hasPermission('employees.delete')`
- `src/components/bookings/BookingServicesTab.tsx`: Bọc nút xóa bằng `hasPermission('bookings.delete')`
- `src/components/bookings/BookingItineraryTab.tsx`: Bọc nút xóa bằng `hasPermission('bookings.delete')`
- `src/components/finance/ExpenseListTab.tsx`: Tách nút xóa riêng, bọc bằng `hasPermission('finance.edit')` (giữ nguyên — chỉ ADMIN/KETOAN/DIRECTOR có RLS)
- `src/components/finance/TransactionListTab.tsx`: Tương tự

