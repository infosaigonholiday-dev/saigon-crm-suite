

# Kế hoạch sửa (cập nhật lần 5)

## Sửa lại 2 điểm

### 1. Nút Xuất CSV — chỉ ADMIN thấy
Permission `customers.export` chỉ gán cho: **ADMIN, SUPER_ADMIN**. Không ai khác.

### 2. Nhà cung cấp — loại trừ DIRECTOR
Permission `vendors.view` gán cho: **ADMIN, SUPER_ADMIN, DIEUHAN, KETOAN, HR_HEAD**. DIRECTOR không thấy.

---

## Tổng thay đổi: 1 migration + 6 file code

### A. Permission keys mới
- `customers.export` → ADMIN, SUPER_ADMIN
- `vendors.view` → ADMIN, SUPER_ADMIN, DIEUHAN, KETOAN, HR_HEAD

**File**: `src/hooks/usePermissions.ts` — thêm 2 key + gán default

### B. UI
- `src/pages/Customers.tsx` — bọc nút Xuất CSV bằng `hasPermission("customers.export")`
- `src/components/AppSidebar.tsx` — đổi permission NCC từ `bookings.view` → `vendors.view`
- `src/pages/Vendors.tsx` — thêm PermissionGuard `vendors.view`

### C. Thêm trường doanh nghiệp (giữ nguyên)
**DB Migration** thêm cột vào `leads` (7 cột) + `customers` (5 cột) + cập nhật function `get_default_permissions_for_role`

**Files UI**:
- `src/components/leads/LeadFormDialog.tsx` — thêm trường input
- `src/pages/Leads.tsx` — hiển thị thông tin DN
- `src/components/customers/CustomerFormDialog.tsx` — thêm trường input
- `src/pages/CustomerDetail.tsx` — hiển thị thông tin mới

### Tóm tắt phân quyền

| Tính năng | Roles được phép |
|-----------|----------------|
| Xuất CSV khách hàng | ADMIN, SUPER_ADMIN |
| Nhà cung cấp | ADMIN, SUPER_ADMIN, DIEUHAN, KETOAN, HR_HEAD |

