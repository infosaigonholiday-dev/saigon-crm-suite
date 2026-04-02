

# Refactor Sidebar: dùng `getVisibleModules()` thay vì `hasPermission` từng item

## Thay đổi

### `src/components/AppSidebar.tsx`

Thay thế cơ chế filter hiện tại (dùng `hasPermission`/`hasAnyPermission` check từng item) bằng `getVisibleModules()`:

1. **Thêm `moduleKey`** vào interface `MenuItem` và gán cho mỗi item (vd: `"customers"`, `"leads"`, `"finance"`, ...)
2. **Thay `filterItems`** bằng logic mới:
   ```ts
   const visibleModules = getVisibleModules();
   const filterItems = (items: MenuItem[]) =>
     items.filter(item => !item.moduleKey || visibleModules.includes(item.moduleKey));
   ```
3. **Bỏ** import `hasPermission`, `hasAnyPermission` — chỉ dùng `getVisibleModules` từ `usePermissions()`
4. **Bỏ** `PermissionKey` type import (không cần nữa)
5. **Bỏ** `permission` và `anyPermission` fields khỏi MenuItem interface

**Mapping moduleKey cho từng item:**
- Dashboard: không cần moduleKey (luôn hiện)
- CRM items: `customers`, `leads`, `quotations`, `tour_packages`, `itineraries`, `accommodations`, `suppliers`, `bookings`, `contracts`, `payments`
- HR items: `staff`, `leave`, `payroll`
- Finance: `finance`
- SOP: `workflow`
- Settings: `settings`

**Trường hợp đặc biệt — Finance**: Hiện dùng `anyPermission: ["finance.view", "finance.submit"]`. Với `getVisibleModules()`, nếu role có bất kỳ quyền nào trong module `finance` (vd: chỉ `finance.submit`), module `"finance"` sẽ xuất hiện trong `getVisibleModules()` — logic tương đương, không cần xử lý riêng.

## File thay đổi
- `src/components/AppSidebar.tsx` — refactor duy nhất

